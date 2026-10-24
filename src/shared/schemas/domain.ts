import { z } from "zod";

const money = z.number().int().safe().nonnegative();
const nullableMoney = money.nullable();
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime();

export const knownBooleanSchema = z.enum(["YES", "NO", "UNKNOWN"]);
export const accountWrapperSchema = z.enum(["TFSA", "FHSA", "RRSP", "NON_REGISTERED"]);

export const debtSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  balanceCents: money,
  annualRate: z.number().min(0).max(1).nullable(),
  minimumPaymentCents: nullableMoney,
});

export const accountHoldingSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1).max(120),
  name: z.string().min(1).max(120),
  wrapper: accountWrapperSchema.nullable(),
  balanceCents: money,
  annualRate: z.number().min(0).max(1).nullable(),
  promotionEndsOn: isoDate.nullable(),
});

export const financialProfileSchema = z.object({
  id: z.string().min(1),
  country: z.literal("CA"),
  province: z.string().min(2).max(80),
  taxResidence: z.string().min(2).max(80),
  age: z.number().int().min(18).max(120).nullable(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "COMMON_LAW", "SEPARATED", "OTHER"]).nullable(),
  dependants: z.number().int().min(0).max(30).nullable(),
  plannedLifeChanges: z.string().max(1000).nullable(),
  annualGrossIncomeCents: nullableMoney,
  householdIncomeCents: nullableMoney,
  monthlyExpensesCents: nullableMoney,
  currentSavingsCents: money,
  emergencySavingsCents: nullableMoney,
  monthlySavingsCapacityCents: nullableMoney,
  debts: z.array(debtSchema),
  accounts: z.array(accountHoldingSchema),
  tfsaContributionRoomCents: nullableMoney,
  fhsaEligibility: knownBooleanSchema,
  fhsaContributionRoomCents: nullableMoney,
  rrspContributionRoomCents: nullableMoney,
  willingnessToSwitch: z.enum(["LOW", "MEDIUM", "HIGH"]),
  liquidityRequirement: z.enum(["IMMEDIATE", "WITHIN_30_DAYS", "FLEXIBLE"]),
  maximumLockupMonths: z.number().int().min(0).max(600),
  lazinessMode: z.enum(["OPTIMIZER", "RELAXED", "EXTREMELY_LAZY", "CUSTOM"]),
  minimumBenefitCents: money,
  updatedAt: isoDateTime,
});

export const goalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  kind: z.enum(["HOME_DOWN_PAYMENT", "EMERGENCY_FUND", "MAJOR_PURCHASE", "EDUCATION", "GENERAL"]),
  targetAmountCents: money.positive(),
  targetDate: isoDate,
  currentAllocatedCents: money,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

export const profilePatchSchema = z
  .object({
    annualGrossIncomeCents: nullableMoney.optional(),
    householdIncomeCents: nullableMoney.optional(),
    monthlyExpensesCents: nullableMoney.optional(),
    currentSavingsCents: money.optional(),
    emergencySavingsCents: nullableMoney.optional(),
    monthlySavingsCapacityCents: nullableMoney.optional(),
    tfsaContributionRoomCents: nullableMoney.optional(),
    fhsaEligibility: knownBooleanSchema.optional(),
    fhsaContributionRoomCents: nullableMoney.optional(),
    rrspContributionRoomCents: nullableMoney.optional(),
    willingnessToSwitch: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    liquidityRequirement: z.enum(["IMMEDIATE", "WITHIN_30_DAYS", "FLEXIBLE"]).optional(),
    maximumLockupMonths: z.number().int().min(0).max(600).optional(),
    minimumBenefitCents: money.optional(),
  })
  .strict();

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
