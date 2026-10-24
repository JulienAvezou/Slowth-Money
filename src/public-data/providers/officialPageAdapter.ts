import { createHash } from "node:crypto";
import type { FinancialProduct } from "../../shared/types/domain";
import type { FinancialProviderAdapter, ProviderFetchResult } from "./providerAdapter";

interface OfficialPageConfig {
  id: string;
  provider: string;
  productName: string;
  url: string;
  ratePattern: RegExp;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
}

export class OfficialPageSavingsAdapter implements FinancialProviderAdapter {
  public readonly jurisdiction = "CA" as const;
  public readonly id: string;

  public constructor(private readonly config: OfficialPageConfig) {
    this.id = config.id;
  }

  public async fetchProducts(signal?: AbortSignal): Promise<ProviderFetchResult> {
    const response = await fetch(this.config.url, {
      headers: { "user-agent": "Slowth-Money/0.1 public-rate-check" },
      ...(signal === undefined ? {} : { signal }),
    });
    if (!response.ok) throw new Error(`${this.config.provider} returned ${response.status}.`);
    const text = stripHtml(await response.text());
    const match = this.config.ratePattern.exec(text);
    if (match?.[1] === undefined) {
      return { providerId: this.id, products: [], warnings: ["No verifiable rate was found."] };
    }
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 25) {
      return { providerId: this.id, products: [], warnings: ["The discovered rate was invalid."] };
    }
    const now = new Date().toISOString();
    const product: FinancialProduct = {
      id: createHash("sha256").update(`${this.id}:${this.config.productName}`).digest("hex"),
      provider: this.config.provider,
      productName: this.config.productName,
      productType: "HISA",
      baseAnnualRate: parsed / 100,
      promotionalAnnualRate: null,
      promotionStartsOn: null,
      promotionEndsOn: null,
      supportedWrappers: null,
      monthlyFeeCents: null,
      minimumBalanceCents: null,
      maximumPromotionalBalanceCents: null,
      newCustomerOnly: "UNKNOWN",
      eligibilityNotes:
        "Verify wrapper support, fees, and eligibility on the official page before acting.",
      lockupMonths: 0,
      provenance: {
        sourceUrl: this.config.url,
        sourceName: `${this.config.provider} official product page`,
        sourceType: "FINANCIAL_INSTITUTION",
        retrievedAt: now,
        lastVerifiedAt: now,
        confidence: 0.95,
      },
    };
    return { providerId: this.id, products: [product], warnings: [] };
  }
}

export const canadaProviderAdapters: FinancialProviderAdapter[] = [
  new OfficialPageSavingsAdapter({
    id: "eq-bank",
    provider: "EQ Bank",
    productName: "Personal Account",
    url: "https://www.eqbank.ca/personal-banking/personal-account",
    ratePattern: /(?:interest|rate)[^%]{0,100}?([0-9]+(?:\.[0-9]+)?)\s*%/i,
  }),
  new OfficialPageSavingsAdapter({
    id: "tangerine",
    provider: "Tangerine",
    productName: "Savings Account",
    url: "https://www.tangerine.ca/en/personal/save/savings-account",
    ratePattern: /(?:interest|rate)[^%]{0,100}?([0-9]+(?:\.[0-9]+)?)\s*%/i,
  }),
  new OfficialPageSavingsAdapter({
    id: "simplii",
    provider: "Simplii Financial",
    productName: "High Interest Savings Account",
    url: "https://www.simplii.com/en/bank-accounts/high-interest-savings.html",
    ratePattern: /(?:interest|rate)[^%]{0,100}?([0-9]+(?:\.[0-9]+)?)\s*%/i,
  }),
];
