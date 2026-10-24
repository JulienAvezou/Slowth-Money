import { describe, expect, it } from "vitest";
import {
  convertModelProfilePatch,
  parseModelProfilePatchResponse,
  proposalForIncomeRaise,
} from "../../src/ai/schemas/profilePatch";
import { evaluateSavingsOpportunity } from "../../src/core/planning/evaluateOpportunity";
import { demoProfile } from "../../src/renderer/src/demo";
import { profilePatchSchema } from "../../src/shared/schemas/domain";
import type { AccountHolding, FinancialProduct } from "../../src/shared/types/domain";

const holding: AccountHolding = {
  id: "holding",
  provider: "Old bank",
  name: "Savings",
  wrapper: "TFSA",
  balanceCents: 2_500_000,
  annualRate: 0.02,
  promotionEndsOn: null,
};
const product: FinancialProduct = {
  id: "product",
  provider: "New bank",
  productName: "HISA",
  productType: "HISA",
  baseAnnualRate: 0.05,
  promotionalAnnualRate: null,
  promotionStartsOn: null,
  promotionEndsOn: null,
  supportedWrappers: null,
  monthlyFeeCents: 0,
  minimumBalanceCents: null,
  maximumPromotionalBalanceCents: null,
  newCustomerOnly: "UNKNOWN",
  eligibilityNotes: null,
  lockupMonths: 0,
  provenance: {
    sourceUrl: "https://bank.example/rate",
    sourceName: "Official bank",
    sourceType: "FINANCIAL_INSTITUTION",
    retrievedAt: "2026-10-20T00:00:00.000Z",
    lastVerifiedAt: "2026-10-20T00:00:00.000Z",
    confidence: 0.95,
  },
};

describe("profile patch validation", () => {
  it("accepts explicit unknown and rejects invented fields", () => {
    expect(profilePatchSchema.parse({ tfsaContributionRoomCents: null })).toEqual({
      tfsaContributionRoomCents: null,
    });
    expect(() => profilePatchSchema.parse({ salary: 100_000 })).toThrow();
  });

  it("converts CAD dollar amounts to cents after model validation", () => {
    const proposal = convertModelProfilePatch(
      {
        patch: {
          annualGrossIncome: { operation: "SET", amountCad: 200 },
          monthlySavingsCapacity: { operation: "INCREASE_BY", amountCad: 200 },
        },
        rationale: "The user reported CAD amounts.",
        uncertainties: [],
      },
      demoProfile,
    );

    expect(proposal.patch.annualGrossIncomeCents).toBe(20_000);
    expect(proposal.patch.monthlySavingsCapacityCents).toBe(270_000);
  });

  it("refuses to calculate a delta when the current amount is unknown", () => {
    const proposal = convertModelProfilePatch(
      {
        patch: { householdIncome: { operation: "INCREASE_BY", amountCad: 200 } },
        rationale: "The user described an increase.",
        uncertainties: [],
      },
      demoProfile,
    );

    expect(proposal.patch.householdIncomeCents).toBeUndefined();
    expect(proposal.uncertainties).toContain(
      "The current household income is unknown, so the change was not calculated.",
    );
  });

  it("rejects the old cents-based model contract", () => {
    expect(() =>
      convertModelProfilePatch(
        {
          patch: { annualGrossIncomeCents: 200 },
          rationale: "Invalid old format.",
          uncertainties: [],
        },
        demoProfile,
      ),
    ).toThrow();
  });

  it("asks for the period instead of guessing how to apply an ambiguous raise", () => {
    const proposal = proposalForIncomeRaise("I got a 200 dollar raise", demoProfile, "CAD");

    expect(proposal?.patch).toEqual({});
    expect(proposal?.uncertainties).toContain("Is the gross raise monthly or annual?");
  });

  it("annualizes a gross monthly raise using current income and the profile currency", () => {
    const proposal = proposalForIncomeRaise("I got a 200 gross monthly raise", demoProfile, "CAD");

    expect(proposal?.patch.annualGrossIncomeCents).toBe(12_740_000);
    expect(proposal?.rationale).toContain("$200 × 12 months = $2,400");
    expect(proposal?.rationale).toContain("Using CAD, your profile default");
    expect(proposal?.uncertainties).toEqual([]);
  });

  it("uses the current annual income as the base for an annual raise", () => {
    const proposal = proposalForIncomeRaise("I got a $200 annual raise", demoProfile, "CAD");

    expect(proposal?.patch.annualGrossIncomeCents).toBe(12_520_000);
  });

  it("does not apply a raise when current income is unknown or currency differs", () => {
    const unknownIncome = proposalForIncomeRaise(
      "I got a CAD 200 monthly raise",
      { ...demoProfile, annualGrossIncomeCents: null },
      "CAD",
    );
    const foreignCurrency = proposalForIncomeRaise(
      "I got a USD 200 monthly raise",
      demoProfile,
      "CAD",
    );

    expect(unknownIncome?.patch).toEqual({});
    expect(foreignCurrency?.patch).toEqual({});
    expect(foreignCurrency?.uncertainties[0]).toContain("exchange rate");
  });

  it("fails closed when Gemma returns direct CAD fields and a string uncertainty", () => {
    const proposal = parseModelProfilePatchResponse(
      JSON.stringify({
        patch: { annualGrossIncomeCad: 200 },
        rationale: "The user reported a raise.",
        uncertainties: "The raise period is unclear.",
      }),
      demoProfile,
    );

    expect(proposal.patch).toEqual({});
    expect(proposal.uncertainties).toContain("The raise period is unclear.");
    expect(proposal.uncertainties).toContain(
      "Slowth could not safely interpret the local model response, so no profile changes were applied.",
    );
  });

  it("fails closed when the local model returns invalid JSON", () => {
    const proposal = parseModelProfilePatchResponse("not json", demoProfile);

    expect(proposal.patch).toEqual({});
    expect(proposal.uncertainties).toHaveLength(1);
  });
});

describe("unknown eligibility handling", () => {
  it("keeps a calculated candidate visible but prevents interruption", () => {
    const result = evaluateSavingsOpportunity({
      holding,
      product,
      thresholdCents: 2_500,
      comparisonMonths: 6,
      asOf: "2026-10-20",
    });
    expect(result?.expectedBenefitCents).toBe(37_500);
    expect(result?.missingInformation).toEqual([
      "Supported account wrappers",
      "Promotion eligibility",
    ]);
    expect(result?.exceedsThreshold).toBe(false);
  });

  it("rejects a product that does not support the holding wrapper", () => {
    expect(
      evaluateSavingsOpportunity({
        holding,
        product: { ...product, supportedWrappers: ["NON_REGISTERED"] },
        thresholdCents: 0,
        comparisonMonths: 6,
        asOf: "2026-10-20",
      }),
    ).toBeNull();
  });
});
