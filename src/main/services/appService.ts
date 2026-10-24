import { readFile, writeFile } from "node:fs/promises";
import type { BrowserWindow, OpenDialogOptions, SaveDialogOptions } from "electron";
import { dialog, Notification } from "electron";
import { OllamaClient } from "../../ai/ollama/client";
import type { AdvisorMessage } from "../../ai/schemas/advisor";
import { projectGoal } from "../../core/calculations/projections";
import { evaluateSavingsOpportunity } from "../../core/planning/evaluateOpportunity";
import type { EncryptedRecordRepository } from "../../data/repositories/encryptedRecordRepository";
import type { PublicProductRepository } from "../../data/repositories/publicProductRepository";
import type { RefreshStateRepository } from "../../data/repositories/refreshStateRepository";
import { refreshProviders } from "../../public-data/ingestion/refreshProviders";
import { canadaProviderAdapters } from "../../public-data/providers/officialPageAdapter";
import { verifyCanadaRuleSources } from "../../public-data/country-packs/canada/refreshRules";
import { SerpApiSearchProvider } from "../../public-data/search/serpApi";
import { buildPublicProductQuery } from "../../public-data/search/searchProvider";
import { evaluateFreshness } from "../../core/freshness/freshness";
import { financialProfileSchema, goalSchema } from "../../shared/schemas/domain";
import { DEFAULT_SETTINGS, settingsSchema, type AppSettings } from "../../shared/schemas/settings";
import type { FinancialProfile, Goal } from "../../shared/types/domain";
import type { ManualPublicDataRefreshResult, PersistedState } from "../../shared/types/ipc";

export class AppService {
  public constructor(
    private readonly records: EncryptedRecordRepository,
    private readonly products: PublicProductRepository,
    private readonly refreshState: RefreshStateRepository,
    private readonly getWindow: () => BrowserWindow | null,
  ) {}

  public loadState(): PersistedState {
    const settings = this.getSettings();
    return {
      profile: this.records.get("profile", financialProfileSchema),
      goal: this.records.get("goal", goalSchema),
      settings: {
        ollamaBaseUrl: settings.ollamaBaseUrl,
        ollamaModel: settings.ollamaModel,
        notifications: settings.notifications,
        hasSerpApiKey: settings.serpApiKey.length > 0,
      },
      products: this.products.list(),
      freshness: {
        products: this.toFreshness("FINANCIAL_PRODUCTS"),
        rules: this.toFreshness("COUNTRY_RULES"),
      },
      storageError: null,
    };
  }

  public saveProfile(profile: FinancialProfile): FinancialProfile {
    return this.records.set(
      "profile",
      { ...profile, updatedAt: new Date().toISOString() },
      financialProfileSchema,
    );
  }

  public saveGoal(goal: Goal): Goal {
    return this.records.set("goal", { ...goal, updatedAt: new Date().toISOString() }, goalSchema);
  }

  public saveSettings(settings: AppSettings): void {
    const current = this.getSettings();
    this.records.set(
      "settings",
      {
        ...settings,
        serpApiKey: settings.serpApiKey.trim() === "" ? current.serpApiKey : settings.serpApiKey,
      },
      settingsSchema,
    );
  }

  public getSettings(): AppSettings {
    return this.records.get("settings", settingsSchema) ?? DEFAULT_SETTINGS;
  }

  public ollama(): OllamaClient {
    const settings = this.getSettings();
    return new OllamaClient({ baseUrl: settings.ollamaBaseUrl, model: settings.ollamaModel });
  }

  public async proposeProfilePatch(instruction: string) {
    const profile = this.records.get("profile", financialProfileSchema);
    if (profile === null)
      throw new Error("Create a financial profile before using conversational updates.");
    return this.ollama().proposeProfilePatch(instruction, profile);
  }

  public async askFinancialAdvisor(messages: AdvisorMessage[]) {
    const profile = this.records.get("profile", financialProfileSchema);
    const goal = this.records.get("goal", goalSchema);
    const products = this.products.list();
    const asOfDate = new Date().toISOString().slice(0, 10);
    const projection =
      profile === null || goal === null
        ? null
        : projectGoal({
            goal,
            monthlyContributionCents: profile.monthlySavingsCapacityCents,
            asOfDate,
            annualRate: 0,
          });
    const recommendations =
      profile === null
        ? []
        : profile.accounts
            .flatMap((holding) =>
              products.map((product) =>
                evaluateSavingsOpportunity({
                  holding,
                  product,
                  thresholdCents: profile.minimumBenefitCents,
                  comparisonMonths: 6,
                  asOf: asOfDate,
                }),
              ),
            )
            .filter((recommendation) => recommendation !== null)
            .sort(
              (left, right) => (right.expectedBenefitCents ?? 0) - (left.expectedBenefitCents ?? 0),
            );

    return this.ollama().askFinancialAdvisor(messages, {
      asOfDate,
      profile,
      goal,
      projection,
      products,
      recommendations,
      freshness: {
        products: this.toFreshness("FINANCIAL_PRODUCTS"),
        rules: this.toFreshness("COUNTRY_RULES"),
      },
    });
  }

  public async refreshProducts(): Promise<{
    status: string;
    productCount: number;
    failures: number;
  }> {
    const result = await refreshProviders(canadaProviderAdapters);
    if (result.products.length > 0) this.products.replace(result.products);
    this.refreshState.record(
      "FINANCIAL_PRODUCTS",
      result.status,
      result.failed.map(({ providerId, reason }) => `${providerId}: ${reason}`).join("; ") || null,
      result.status === "SUCCESS",
    );
    return {
      status: result.status,
      productCount: result.products.length,
      failures: result.failed.length,
    };
  }

  public async refreshPublicDataNow(): Promise<ManualPublicDataRefreshResult> {
    const settings = this.getSettings();
    if (settings.serpApiKey.trim() === "") {
      throw new Error("Save a SerpApi key in Settings before running a discovery refresh.");
    }

    const checkedAt = new Date();
    const query = buildPublicProductQuery({
      country: "Canada",
      category: "high interest savings",
      month: checkedAt.toISOString().slice(0, 7),
    });
    const productRefresh = this.refreshProducts();
    let discoveryResults;
    try {
      discoveryResults = await new SerpApiSearchProvider(settings.serpApiKey).search(
        query,
        AbortSignal.timeout(15_000),
      );
    } catch (error) {
      await productRefresh;
      throw error;
    }
    const products = await productRefresh;

    return {
      query,
      discoveryResultCount: discoveryResults.length,
      productStatus: products.status,
      productCount: products.productCount,
      providerFailures: products.failures,
      checkedAt: checkedAt.toISOString(),
    };
  }

  public async refreshStaleData(): Promise<void> {
    const now = new Date();
    const settings = this.getSettings();
    const productState = this.refreshState.get("FINANCIAL_PRODUCTS");
    const ruleState = this.refreshState.get("COUNTRY_RULES");
    const jobs: Promise<unknown>[] = [];
    if (evaluateFreshness("FINANCIAL_PRODUCTS", productState.lastVerifiedAt, now).stale) {
      jobs.push(
        settings.serpApiKey.trim() === "" ? this.refreshProducts() : this.refreshPublicDataNow(),
      );
    }
    if (evaluateFreshness("COUNTRY_RULES", ruleState.lastVerifiedAt, now).stale) {
      jobs.push(this.refreshRules());
    }
    await Promise.allSettled(jobs);
  }

  private async refreshRules(): Promise<void> {
    const result = await verifyCanadaRuleSources();
    this.refreshState.record(
      "COUNTRY_RULES",
      result.status,
      result.failed.join("; ") || null,
      result.status === "SUCCESS",
    );
  }

  private toFreshness(category: "FINANCIAL_PRODUCTS" | "COUNTRY_RULES") {
    const value = this.refreshState.get(category);
    return { lastVerifiedAt: value.lastVerifiedAt, status: value.status };
  }

  public async exportProfile(): Promise<boolean> {
    const profile = this.records.get("profile", financialProfileSchema);
    if (profile === null) throw new Error("There is no financial profile to export.");
    const options: SaveDialogOptions = {
      title: "Export sensitive financial profile",
      defaultPath: "slowth-money-profile.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
      message: "This unencrypted file contains sensitive financial information. Store it securely.",
    };
    const window = this.getWindow();
    const result =
      window === null
        ? await dialog.showSaveDialog(options)
        : await dialog.showSaveDialog(window, options);
    if (result.canceled || result.filePath === undefined) return false;
    await writeFile(result.filePath, JSON.stringify(profile, null, 2), { mode: 0o600 });
    return true;
  }

  public async importProfile(): Promise<FinancialProfile | null> {
    const options: OpenDialogOptions = {
      title: "Import sensitive financial profile",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    };
    const window = this.getWindow();
    const result =
      window === null
        ? await dialog.showOpenDialog(options)
        : await dialog.showOpenDialog(window, options);
    const file = result.filePaths[0];
    if (result.canceled || file === undefined) return null;
    const parsed = financialProfileSchema.parse(
      JSON.parse(await readFile(file, "utf8")) as unknown,
    );
    return this.records.set("profile", parsed, financialProfileSchema);
  }

  public deleteAllData(): void {
    this.records.deleteAllPrivateData();
  }

  public showDemoNotification(kind: "OPPORTUNITY" | "PROMOTION" | "MILESTONE"): void {
    const contentByKind: Record<typeof kind, readonly [string, string]> = {
      OPPORTUNITY: [
        "Slowth Money found one opportunity",
        "A potential improvement beats your laziness threshold.",
      ],
      PROMOTION: [
        "Slowth Money promotion reminder",
        "A recorded promotional rate is approaching its expiry date.",
      ],
      MILESTONE: ["Slow and steady is working", "You crossed a meaningful goal milestone."],
    };
    const content = contentByKind[kind];
    const notification = new Notification({ title: content[0], body: content[1] });
    notification.on("click", () => this.getWindow()?.show());
    notification.show();
  }
}
