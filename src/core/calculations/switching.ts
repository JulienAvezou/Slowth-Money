import { promotionalInterest, simpleInterest } from "./interest";
import type { MoneyCents } from "../../shared/types/domain";

export interface SwitchingInput {
  balanceCents: MoneyCents;
  currentAnnualRate: number;
  candidateBaseAnnualRate: number;
  candidatePromotionalAnnualRate: number | null;
  promotionalMonths: number;
  comparisonMonths: number;
  monthlyFeeCents: MoneyCents | null;
}

export function incrementalSwitchingBenefit(input: SwitchingInput): MoneyCents {
  const current = simpleInterest(
    input.balanceCents,
    input.currentAnnualRate,
    input.comparisonMonths,
  );
  const candidate =
    input.candidatePromotionalAnnualRate === null
      ? simpleInterest(input.balanceCents, input.candidateBaseAnnualRate, input.comparisonMonths)
      : promotionalInterest(
          input.balanceCents,
          input.candidateBaseAnnualRate,
          input.candidatePromotionalAnnualRate,
          input.comparisonMonths,
          Math.min(input.promotionalMonths, input.comparisonMonths),
        );
  const fees = (input.monthlyFeeCents ?? 0) * input.comparisonMonths;
  return Math.max(0, candidate - current - fees);
}

export function exceedsLazinessThreshold(
  benefitCents: MoneyCents,
  thresholdCents: MoneyCents,
): boolean {
  return benefitCents >= thresholdCents;
}
