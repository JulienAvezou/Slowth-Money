export type MoneyCents = number;
export type IsoDate = string;
export type IsoDateTime = string;

export type AccountWrapper = "TFSA" | "FHSA" | "RRSP" | "NON_REGISTERED";
export type ProductType = "SAVINGS" | "HISA" | "GIC";
export type KnownBoolean = "YES" | "NO" | "UNKNOWN";
export type GoalStatus = "AHEAD" | "ON_TRACK" | "BEHIND" | "NEEDS_INFORMATION";
export type LazinessMode = "OPTIMIZER" | "RELAXED" | "EXTREMELY_LAZY" | "CUSTOM";
export type SourceType =
  | "GOVERNMENT_REGULATOR"
  | "FINANCIAL_INSTITUTION"
  | "ESTABLISHED_COMPARISON"
  | "FINANCIAL_PUBLICATION"
  | "GENERAL_WEB"
  | "FORUM_SOCIAL";

export interface Debt {
  id: string;
  name: string;
  balanceCents: MoneyCents;
  annualRate: number | null;
  minimumPaymentCents: MoneyCents | null;
}

export interface AccountHolding {
  id: string;
  provider: string;
  name: string;
  wrapper: AccountWrapper | null;
  balanceCents: MoneyCents;
  annualRate: number | null;
  promotionEndsOn: IsoDate | null;
}

export interface FinancialProfile {
  id: string;
  country: "CA";
  province: string;
  taxResidence: string;
  age: number | null;
  maritalStatus: "SINGLE" | "MARRIED" | "COMMON_LAW" | "SEPARATED" | "OTHER" | null;
  dependants: number | null;
  plannedLifeChanges: string | null;
  annualGrossIncomeCents: MoneyCents | null;
  householdIncomeCents: MoneyCents | null;
  monthlyExpensesCents: MoneyCents | null;
  currentSavingsCents: MoneyCents;
  emergencySavingsCents: MoneyCents | null;
  monthlySavingsCapacityCents: MoneyCents | null;
  debts: Debt[];
  accounts: AccountHolding[];
  tfsaContributionRoomCents: MoneyCents | null;
  fhsaEligibility: KnownBoolean;
  fhsaContributionRoomCents: MoneyCents | null;
  rrspContributionRoomCents: MoneyCents | null;
  willingnessToSwitch: "LOW" | "MEDIUM" | "HIGH";
  liquidityRequirement: "IMMEDIATE" | "WITHIN_30_DAYS" | "FLEXIBLE";
  maximumLockupMonths: number;
  lazinessMode: LazinessMode;
  minimumBenefitCents: MoneyCents;
  updatedAt: IsoDateTime;
}

export interface Goal {
  id: string;
  name: string;
  kind: "HOME_DOWN_PAYMENT" | "EMERGENCY_FUND" | "MAJOR_PURCHASE" | "EDUCATION" | "GENERAL";
  targetAmountCents: MoneyCents;
  targetDate: IsoDate;
  currentAllocatedCents: MoneyCents;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface SourceProvenance {
  sourceUrl: string;
  sourceName: string;
  sourceType: SourceType;
  retrievedAt: IsoDateTime;
  lastVerifiedAt: IsoDateTime;
  confidence: number;
}

export interface FinancialProduct {
  id: string;
  provider: string;
  productName: string;
  productType: ProductType;
  baseAnnualRate: number | null;
  promotionalAnnualRate: number | null;
  promotionStartsOn: IsoDate | null;
  promotionEndsOn: IsoDate | null;
  supportedWrappers: AccountWrapper[] | null;
  monthlyFeeCents: MoneyCents | null;
  minimumBalanceCents: MoneyCents | null;
  maximumPromotionalBalanceCents: MoneyCents | null;
  newCustomerOnly: KnownBoolean;
  eligibilityNotes: string | null;
  lockupMonths: number | null;
  provenance: SourceProvenance;
}

export interface GoalProjection {
  progressPercent: number;
  requiredMonthlyCents: MoneyCents | null;
  projectedCompletionDate: IsoDate | null;
  projectedAmountAtTargetCents: MoneyCents;
  status: GoalStatus;
  monthsRemaining: number;
}

export interface Recommendation {
  id: string;
  title: string;
  proposedAction: string;
  explanation: string;
  expectedBenefitCents: MoneyCents | null;
  periodMonths: number | null;
  tradeoffs: string[];
  assumptions: string[];
  missingInformation: string[];
  confidence: number;
  sources: SourceProvenance[];
  verifiedAt: IsoDateTime;
  exceedsThreshold: boolean;
}
