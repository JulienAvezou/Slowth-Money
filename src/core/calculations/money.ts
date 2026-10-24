import type { MoneyCents } from "../../shared/types/domain";

export function assertMoney(value: number): MoneyCents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Money must be a non-negative safe integer number of cents.");
  }
  return value;
}

export function roundMoney(valueInCents: number): MoneyCents {
  return assertMoney(Math.round(valueInCents));
}

export function dollarsToCents(value: number): MoneyCents {
  if (!Number.isFinite(value) || value < 0) throw new RangeError("Dollars must be non-negative.");
  return roundMoney(value * 100);
}

export function formatCad(value: MoneyCents): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
  }).format(value / 100);
}
