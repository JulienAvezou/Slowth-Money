import { z } from "zod";
import { dollarsToCents, formatCad } from "../../core/calculations/money";
import { profilePatchSchema } from "../../shared/schemas/domain";
import type { FinancialProfile } from "../../shared/types/domain";

export const proposedProfilePatchSchema = z.object({
  patch: profilePatchSchema,
  rationale: z.string().max(800),
  uncertainties: z.array(z.string().max(300)).max(10),
});

export type ProposedProfilePatch = z.infer<typeof proposedProfilePatchSchema>;

const moneyChangeSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.enum(["SET", "INCREASE_BY", "DECREASE_BY"]),
    amountCad: z.number().finite().nonnegative(),
  }),
  z.object({ operation: z.literal("SET_UNKNOWN") }),
]);

export const modelProposedProfilePatchSchema = z.object({
  patch: z
    .object({
      annualGrossIncome: moneyChangeSchema.optional(),
      householdIncome: moneyChangeSchema.optional(),
      monthlyExpenses: moneyChangeSchema.optional(),
      currentSavings: moneyChangeSchema.optional(),
      emergencySavings: moneyChangeSchema.optional(),
      monthlySavingsCapacity: moneyChangeSchema.optional(),
      tfsaContributionRoom: moneyChangeSchema.optional(),
      fhsaEligibility: z.enum(["YES", "NO", "UNKNOWN"]).optional(),
      fhsaContributionRoom: moneyChangeSchema.optional(),
      rrspContributionRoom: moneyChangeSchema.optional(),
      willingnessToSwitch: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
      liquidityRequirement: z.enum(["IMMEDIATE", "WITHIN_30_DAYS", "FLEXIBLE"]).optional(),
      maximumLockupMonths: z.number().int().min(0).max(600).optional(),
      minimumBenefit: moneyChangeSchema.optional(),
    })
    .strict(),
  rationale: z.string().max(800),
  uncertainties: z.array(z.string().max(300)).max(10),
});

export type ModelProposedProfilePatch = z.infer<typeof modelProposedProfilePatchSchema>;
type MoneyChange = z.infer<typeof moneyChangeSchema>;

const raiseLanguage = /\b(?:raise|pay\s+(?:increase|bump)|salary\s+(?:increase|bump))\b/i;
const annualIncomePeriodLanguage = /\b(?:annual(?:ly)?|yearly|per\s+year|a\s+year)\b/i;
const monthlyIncomePeriodLanguage = /\b(?:monthly|per\s+month|a\s+month)\b/i;
const foreignCurrencyLanguage =
  /(?:\b(?:USD|EUR|GBP|AUD|JPY|US\s+dollars?|euros?|pounds?)\b|US\$|€|£|¥)/i;
const numericAmountSource = "(\\d+(?:,\\d{3})*(?:\\.\\d{1,2})?)";

interface MoneyMapping {
  modelField: keyof ModelProposedProfilePatch["patch"];
  profileField: keyof FinancialProfile;
  outputField: keyof ProposedProfilePatch["patch"];
  label: string;
  nullable: boolean;
}

const moneyMappings: MoneyMapping[] = [
  {
    modelField: "annualGrossIncome",
    profileField: "annualGrossIncomeCents",
    outputField: "annualGrossIncomeCents",
    label: "annual gross income",
    nullable: true,
  },
  {
    modelField: "householdIncome",
    profileField: "householdIncomeCents",
    outputField: "householdIncomeCents",
    label: "household income",
    nullable: true,
  },
  {
    modelField: "monthlyExpenses",
    profileField: "monthlyExpensesCents",
    outputField: "monthlyExpensesCents",
    label: "monthly expenses",
    nullable: true,
  },
  {
    modelField: "currentSavings",
    profileField: "currentSavingsCents",
    outputField: "currentSavingsCents",
    label: "current savings",
    nullable: false,
  },
  {
    modelField: "emergencySavings",
    profileField: "emergencySavingsCents",
    outputField: "emergencySavingsCents",
    label: "emergency savings",
    nullable: true,
  },
  {
    modelField: "monthlySavingsCapacity",
    profileField: "monthlySavingsCapacityCents",
    outputField: "monthlySavingsCapacityCents",
    label: "monthly savings capacity",
    nullable: true,
  },
  {
    modelField: "tfsaContributionRoom",
    profileField: "tfsaContributionRoomCents",
    outputField: "tfsaContributionRoomCents",
    label: "TFSA contribution room",
    nullable: true,
  },
  {
    modelField: "fhsaContributionRoom",
    profileField: "fhsaContributionRoomCents",
    outputField: "fhsaContributionRoomCents",
    label: "FHSA contribution room",
    nullable: true,
  },
  {
    modelField: "rrspContributionRoom",
    profileField: "rrspContributionRoomCents",
    outputField: "rrspContributionRoomCents",
    label: "RRSP contribution room",
    nullable: true,
  },
  {
    modelField: "minimumBenefit",
    profileField: "minimumBenefitCents",
    outputField: "minimumBenefitCents",
    label: "minimum worthwhile benefit",
    nullable: false,
  },
];

export function convertModelProfilePatch(
  input: unknown,
  currentProfile: FinancialProfile,
): ProposedProfilePatch {
  const modelProposal = modelProposedProfilePatchSchema.parse(input);
  const output: Record<string, unknown> = {};
  const uncertainties = [...modelProposal.uncertainties];

  for (const mapping of moneyMappings) {
    const change = modelProposal.patch[mapping.modelField] as MoneyChange | undefined;
    if (change === undefined) continue;
    const currentValue = currentProfile[mapping.profileField];
    const currentCents = typeof currentValue === "number" ? currentValue : null;
    const converted = applyMoneyChange(change, currentCents, mapping, uncertainties);
    if (converted.applied) output[mapping.outputField] = converted.value;
  }

  const patch = modelProposal.patch;
  if (patch.fhsaEligibility !== undefined) output.fhsaEligibility = patch.fhsaEligibility;
  if (patch.willingnessToSwitch !== undefined)
    output.willingnessToSwitch = patch.willingnessToSwitch;
  if (patch.liquidityRequirement !== undefined)
    output.liquidityRequirement = patch.liquidityRequirement;
  if (patch.maximumLockupMonths !== undefined)
    output.maximumLockupMonths = patch.maximumLockupMonths;

  return proposedProfilePatchSchema.parse({
    patch: output,
    rationale: modelProposal.rationale,
    uncertainties,
  });
}

export function proposalForIncomeRaise(
  instruction: string,
  currentProfile: FinancialProfile,
  profileCurrency: "CAD",
): ProposedProfilePatch | null {
  if (!raiseLanguage.test(instruction)) return null;

  if (foreignCurrencyLanguage.test(instruction)) {
    return proposedProfilePatchSchema.parse({
      patch: {},
      rationale: `No income change was proposed because the profile currency is ${profileCurrency}.`,
      uncertainties: [
        `Provide the raise in ${profileCurrency}; Slowth Money does not assume an exchange rate.`,
      ],
    });
  }

  const amountCad = extractRaiseAmount(instruction);
  if (amountCad === null) {
    return proposedProfilePatchSchema.parse({
      patch: {},
      rationale: "No income change was proposed because the raise amount is unclear.",
      uncertainties: [`What is the raise amount in ${profileCurrency}?`],
    });
  }

  const multiplier = monthlyIncomePeriodLanguage.test(instruction)
    ? 12
    : annualIncomePeriodLanguage.test(instruction)
      ? 1
      : null;
  if (multiplier === null) {
    return proposedProfilePatchSchema.parse({
      patch: {},
      rationale: "No income change was proposed because the raise period is unclear.",
      uncertainties: ["Is the gross raise monthly or annual?"],
    });
  }

  if (currentProfile.annualGrossIncomeCents === null) {
    return proposedProfilePatchSchema.parse({
      patch: {},
      rationale: "The raise cannot be applied without a current annual gross income.",
      uncertainties: ["Add your current annual gross income to your profile first."],
    });
  }

  const annualIncreaseCents = dollarsToCents(amountCad * multiplier);
  const nextAnnualIncomeCents = currentProfile.annualGrossIncomeCents + annualIncreaseCents;
  const calculation =
    multiplier === 12
      ? `${formatCad(dollarsToCents(amountCad))} × 12 months = ${formatCad(annualIncreaseCents)}`
      : `${formatCad(annualIncreaseCents)} per year`;

  return proposedProfilePatchSchema.parse({
    patch: { annualGrossIncomeCents: nextAnnualIncomeCents },
    rationale: `Using ${profileCurrency}, your profile default: ${calculation}. Annual gross income changes from ${formatCad(currentProfile.annualGrossIncomeCents)} to ${formatCad(nextAnnualIncomeCents)}.`,
    uncertainties: [],
  });
}

function extractRaiseAmount(instruction: string): number | null {
  const markedPatterns = [
    new RegExp(`(?:C\\$|CAD\\s*\\$?|\\$)\\s*${numericAmountSource}`, "i"),
    new RegExp(`${numericAmountSource}\\s*(?:CAD|Canadian\\s+dollars?|dollars?)\\b`, "i"),
  ];
  for (const pattern of markedPatterns) {
    const match = instruction.match(pattern);
    const value = parseAmount(match?.[1]);
    if (value !== null) return value;
  }

  const unmarkedAmounts = [
    ...instruction.matchAll(new RegExp(`\\b${numericAmountSource}\\b`, "gi")),
  ].flatMap((match) => {
    const value = parseAmount(match[1]);
    return value === null ? [] : [value];
  });
  return unmarkedAmounts.length === 1 ? (unmarkedAmounts[0] ?? null) : null;
}

function parseAmount(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseModelProfilePatchResponse(
  response: string,
  currentProfile: FinancialProfile,
): ProposedProfilePatch {
  let input: unknown;
  try {
    input = JSON.parse(response) as unknown;
    return convertModelProfilePatch(input, currentProfile);
  } catch {
    return invalidModelResponseProposal(input);
  }
}

function invalidModelResponseProposal(input: unknown): ProposedProfilePatch {
  const uncertainties = extractUncertainties(input);
  uncertainties.push(
    "Slowth could not safely interpret the local model response, so no profile changes were applied.",
  );

  return proposedProfilePatchSchema.parse({
    patch: {},
    rationale: "The proposed update needs clarification before it can change your profile.",
    uncertainties: uncertainties.slice(0, 10),
  });
}

function extractUncertainties(input: unknown): string[] {
  if (typeof input !== "object" || input === null || !("uncertainties" in input)) return [];
  const value = input.uncertainties;
  const candidates = typeof value === "string" ? [value] : Array.isArray(value) ? value : [];
  return candidates
    .filter((candidate): candidate is string => typeof candidate === "string")
    .map((candidate) => candidate.trim().slice(0, 300))
    .filter((candidate) => candidate.length > 0)
    .slice(0, 9);
}

function applyMoneyChange(
  change: MoneyChange,
  currentCents: number | null,
  mapping: MoneyMapping,
  uncertainties: string[],
): { applied: true; value: number | null } | { applied: false } {
  if (change.operation === "SET_UNKNOWN") {
    if (mapping.nullable) return { applied: true, value: null };
    uncertainties.push(`${mapping.label} cannot be set to unknown.`);
    return { applied: false };
  }
  const amountCents = dollarsToCents(change.amountCad);
  if (change.operation === "SET") return { applied: true, value: amountCents };
  if (currentCents === null) {
    uncertainties.push(
      `The current ${mapping.label} is unknown, so the change was not calculated.`,
    );
    return { applied: false };
  }
  if (change.operation === "INCREASE_BY") {
    return { applied: true, value: currentCents + amountCents };
  }
  if (amountCents > currentCents) {
    uncertainties.push(`The decrease is larger than the current ${mapping.label}.`);
    return { applied: false };
  }
  return { applied: true, value: currentCents - amountCents };
}
