import type { FinancialProfile, FinancialProduct, Goal } from "../../shared/types/domain";

const updatedAt = "2026-10-20T13:00:00.000Z";

export const demoProfile: FinancialProfile = {
  id: "demo-profile",
  country: "CA",
  province: "Ontario",
  taxResidence: "Canada",
  age: 32,
  maritalStatus: "SINGLE",
  dependants: 0,
  plannedLifeChanges: "First home purchase",
  annualGrossIncomeCents: 12_500_000,
  householdIncomeCents: null,
  monthlyExpensesCents: 320_000,
  currentSavingsCents: 6_742_000,
  emergencySavingsCents: 1_500_000,
  monthlySavingsCapacityCents: 250_000,
  debts: [],
  accounts: [
    {
      id: "demo-account",
      provider: "Current institution",
      name: "Savings account",
      wrapper: "NON_REGISTERED",
      balanceCents: 2_500_000,
      annualRate: 0.03,
      promotionEndsOn: "2026-12-31",
    },
  ],
  tfsaContributionRoomCents: null,
  fhsaEligibility: "UNKNOWN",
  fhsaContributionRoomCents: null,
  rrspContributionRoomCents: null,
  willingnessToSwitch: "MEDIUM",
  liquidityRequirement: "IMMEDIATE",
  maximumLockupMonths: 0,
  lazinessMode: "RELAXED",
  minimumBenefitCents: 15_000,
  updatedAt,
};

export const demoGoal: Goal = {
  id: "demo-goal",
  name: "Home down payment",
  kind: "HOME_DOWN_PAYMENT",
  targetAmountCents: 15_000_000,
  targetDate: "2029-06-30",
  currentAllocatedCents: 6_742_000,
  createdAt: "2025-01-01T13:00:00.000Z",
  updatedAt,
};

export const demoProducts: FinancialProduct[] = [
  {
    id: "demo-product",
    provider: "Demo Credit Union",
    productName: "Fixture High Interest Savings",
    productType: "HISA",
    baseAnnualRate: 0.025,
    promotionalAnnualRate: 0.0525,
    promotionStartsOn: "2026-10-01",
    promotionEndsOn: "2027-03-01",
    supportedWrappers: ["NON_REGISTERED"],
    monthlyFeeCents: 0,
    minimumBalanceCents: 0,
    maximumPromotionalBalanceCents: 100_000_000,
    newCustomerOnly: "UNKNOWN",
    eligibilityNotes: "Demo fixture only — not a real offer. Eligibility remains unknown.",
    lockupMonths: 0,
    provenance: {
      sourceUrl: "https://example.invalid/demo-fixture",
      sourceName: "Slowth Money demo fixture",
      sourceType: "GENERAL_WEB",
      retrievedAt: updatedAt,
      lastVerifiedAt: updatedAt,
      confidence: 0.4,
    },
  },
];

export function emptyProfile(): FinancialProfile {
  return {
    ...demoProfile,
    id: crypto.randomUUID(),
    age: null,
    maritalStatus: null,
    plannedLifeChanges: null,
    annualGrossIncomeCents: null,
    monthlyExpensesCents: null,
    currentSavingsCents: 0,
    emergencySavingsCents: null,
    monthlySavingsCapacityCents: null,
    accounts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function emptyGoal(): Goal {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "My savings goal",
    kind: "GENERAL",
    targetAmountCents: 1_000_000,
    targetDate: "2029-12-31",
    currentAllocatedCents: 0,
    createdAt: now,
    updatedAt: now,
  };
}
