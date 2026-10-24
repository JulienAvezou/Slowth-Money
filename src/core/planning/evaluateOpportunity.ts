import { incrementalSwitchingBenefit, exceedsLazinessThreshold } from "../calculations/switching";
import type { AccountHolding, FinancialProduct, Recommendation } from "../../shared/types/domain";

export interface OpportunityInput {
  holding: AccountHolding;
  product: FinancialProduct;
  thresholdCents: number;
  comparisonMonths: number;
  asOf: string;
}

export function evaluateSavingsOpportunity(input: OpportunityInput): Recommendation | null {
  const { holding, product } = input;
  if (holding.annualRate === null || product.baseAnnualRate === null) return null;
  if (product.lockupMonths !== null && product.lockupMonths > input.comparisonMonths) return null;
  if (
    holding.wrapper !== null &&
    product.supportedWrappers !== null &&
    !product.supportedWrappers.includes(holding.wrapper)
  )
    return null;

  const missingInformation: string[] = [];
  if (product.supportedWrappers === null) missingInformation.push("Supported account wrappers");
  if (product.newCustomerOnly === "UNKNOWN") missingInformation.push("Promotion eligibility");
  const promotionalMonths = product.promotionEndsOn === null ? 0 : input.comparisonMonths;
  const benefit = incrementalSwitchingBenefit({
    balanceCents: holding.balanceCents,
    currentAnnualRate: holding.annualRate,
    candidateBaseAnnualRate: product.baseAnnualRate,
    candidatePromotionalAnnualRate: product.promotionalAnnualRate,
    promotionalMonths,
    comparisonMonths: input.comparisonMonths,
    monthlyFeeCents: product.monthlyFeeCents,
  });
  const eligibleToInterrupt = missingInformation.length === 0;
  return {
    id: `${holding.id}:${product.id}:${input.asOf}`,
    title: "A savings product may improve expected interest",
    proposedAction: `Review ${product.provider} ${product.productName} and verify its terms.`,
    explanation: "The estimate compares published rates and fees using deterministic calculations.",
    expectedBenefitCents: benefit,
    periodMonths: input.comparisonMonths,
    tradeoffs: ["Requires reviewing or opening another account", "Published rates can change"],
    assumptions: ["Balance remains constant during the comparison period"],
    missingInformation,
    confidence: eligibleToInterrupt
      ? product.provenance.confidence
      : Math.min(0.6, product.provenance.confidence),
    sources: [product.provenance],
    verifiedAt: product.provenance.lastVerifiedAt,
    exceedsThreshold:
      eligibleToInterrupt && exceedsLazinessThreshold(benefit, input.thresholdCents),
  };
}
