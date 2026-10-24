import { describe, expect, it } from "vitest";
import {
  compoundInterest,
  gicMaturity,
  promotionalInterest,
  simpleInterest,
} from "../../src/core/calculations/interest";
import { projectGoal } from "../../src/core/calculations/projections";
import {
  exceedsLazinessThreshold,
  incrementalSwitchingBenefit,
} from "../../src/core/calculations/switching";
import type { Goal } from "../../src/shared/types/domain";

const goal: Goal = {
  id: "goal",
  name: "Down payment",
  kind: "HOME_DOWN_PAYMENT",
  targetAmountCents: 12_000_000,
  targetDate: "2027-01-01",
  currentAllocatedCents: 6_000_000,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("interest calculations", () => {
  it("calculates simple interest in integer cents", () => {
    expect(simpleInterest(1_000_000, 0.05, 6)).toBe(25_000);
  });

  it("calculates compound interest and GIC maturity", () => {
    expect(compoundInterest(1_000_000, 0.05, 12)).toBe(51_162);
    expect(gicMaturity(1_000_000, 0.05, 12)).toBe(1_050_000);
  });

  it("uses the promo rate only during the promotional period", () => {
    expect(promotionalInterest(1_000_000, 0.02, 0.05, 12, 5)).toBe(32_500);
  });
});

describe("goal projections", () => {
  it("projects target value and required monthly savings", () => {
    const result = projectGoal({ goal, monthlyContributionCents: 500_000, asOfDate: "2026-01-01" });
    expect(result.requiredMonthlyCents).toBe(500_000);
    expect(result.projectedAmountAtTargetCents).toBe(12_000_000);
    expect(result.status).toBe("ON_TRACK");
    expect(result.projectedCompletionDate).toBe("2027-01-01");
  });

  it("preserves an unknown monthly contribution", () => {
    const result = projectGoal({ goal, monthlyContributionCents: null, asOfDate: "2026-01-01" });
    expect(result.status).toBe("NEEDS_INFORMATION");
    expect(result.projectedCompletionDate).toBeNull();
  });
});

describe("switching benefit and laziness threshold", () => {
  it("deducts fees from incremental interest", () => {
    expect(
      incrementalSwitchingBenefit({
        balanceCents: 2_500_000,
        currentAnnualRate: 0.03,
        candidateBaseAnnualRate: 0.03,
        candidatePromotionalAnnualRate: 0.05,
        promotionalMonths: 5,
        comparisonMonths: 6,
        monthlyFeeCents: 500,
      }),
    ).toBe(17_833);
  });

  it("includes an opportunity exactly at the threshold", () => {
    expect(exceedsLazinessThreshold(15_000, 15_000)).toBe(true);
    expect(exceedsLazinessThreshold(14_999, 15_000)).toBe(false);
  });
});
