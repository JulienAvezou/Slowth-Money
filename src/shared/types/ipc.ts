import type { ProposedProfilePatch } from "../../ai/schemas/profilePatch";
import type { AdvisorMessage, AdvisorReply } from "../../ai/schemas/advisor";
import type { FinancialProfile, FinancialProduct, Goal } from "./domain";
import type { AppSettings } from "../schemas/settings";

export interface PersistedState {
  profile: FinancialProfile | null;
  goal: Goal | null;
  settings: Omit<AppSettings, "serpApiKey"> & { hasSerpApiKey: boolean };
  products: FinancialProduct[];
  freshness: {
    products: { lastVerifiedAt: string | null; status: string };
    rules: { lastVerifiedAt: string | null; status: string };
  };
  storageError: string | null;
}

export interface ManualPublicDataRefreshResult {
  query: string;
  discoveryResultCount: number;
  productStatus: string;
  productCount: number;
  providerFailures: number;
  checkedAt: string;
}

export interface SlowthApi {
  loadState(): Promise<PersistedState>;
  saveProfile(profile: FinancialProfile): Promise<FinancialProfile>;
  saveGoal(goal: Goal): Promise<Goal>;
  saveSettings(settings: AppSettings): Promise<void>;
  ollamaStatus(): Promise<{
    connected: boolean;
    modelAvailable: boolean;
    model: string;
    message: string;
  }>;
  proposeProfilePatch(instruction: string): Promise<ProposedProfilePatch>;
  askFinancialAdvisor(messages: AdvisorMessage[]): Promise<AdvisorReply>;
  refreshProducts(): Promise<{ status: string; productCount: number; failures: number }>;
  refreshPublicDataNow(): Promise<ManualPublicDataRefreshResult>;
  exportProfile(): Promise<boolean>;
  importProfile(): Promise<FinancialProfile | null>;
  deleteAllData(): Promise<void>;
  showDemoNotification(kind: "OPPORTUNITY" | "PROMOTION" | "MILESTONE"): Promise<void>;
}

declare global {
  interface Window {
    slowth: SlowthApi;
  }
}
