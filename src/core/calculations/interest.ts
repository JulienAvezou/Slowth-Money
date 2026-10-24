import { roundMoney } from "./money";
import type { MoneyCents } from "../../shared/types/domain";

function validateRate(rate: number): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError("Annual rate must be a decimal between 0 and 1.");
  }
}

export function simpleInterest(
  principalCents: MoneyCents,
  annualRate: number,
  months: number,
): MoneyCents {
  validateRate(annualRate);
  if (!Number.isInteger(months) || months < 0) throw new RangeError("Months must be non-negative.");
  return roundMoney(principalCents * annualRate * (months / 12));
}

export function compoundInterest(
  principalCents: MoneyCents,
  annualRate: number,
  months: number,
  compoundsPerYear = 12,
): MoneyCents {
  validateRate(annualRate);
  if (!Number.isInteger(months) || months < 0) throw new RangeError("Months must be non-negative.");
  if (!Number.isInteger(compoundsPerYear) || compoundsPerYear <= 0) {
    throw new RangeError("Compounding frequency must be a positive integer.");
  }
  const periods = (months / 12) * compoundsPerYear;
  const amount = principalCents * Math.pow(1 + annualRate / compoundsPerYear, periods);
  return roundMoney(amount - principalCents);
}

export function promotionalInterest(
  principalCents: MoneyCents,
  baseAnnualRate: number,
  promotionalAnnualRate: number,
  totalMonths: number,
  promotionalMonths: number,
): MoneyCents {
  if (promotionalMonths < 0 || promotionalMonths > totalMonths) {
    throw new RangeError("Promotional months must fall within the total period.");
  }
  return (
    simpleInterest(principalCents, promotionalAnnualRate, promotionalMonths) +
    simpleInterest(principalCents, baseAnnualRate, totalMonths - promotionalMonths)
  );
}

export function gicMaturity(
  principalCents: MoneyCents,
  annualRate: number,
  months: number,
): MoneyCents {
  return principalCents + compoundInterest(principalCents, annualRate, months, 1);
}
