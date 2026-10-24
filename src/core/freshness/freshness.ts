import { FRESHNESS_DAYS } from "../../shared/constants/policies";

export type FreshnessCategory = keyof typeof FRESHNESS_DAYS;

export interface FreshnessResult {
  stale: boolean;
  ageDays: number | null;
  nextRefreshAt: string | null;
}

export function evaluateFreshness(
  category: FreshnessCategory,
  lastVerifiedAt: string | null,
  now: Date,
): FreshnessResult {
  if (lastVerifiedAt === null) return { stale: true, ageDays: null, nextRefreshAt: null };
  const verified = new Date(lastVerifiedAt);
  if (Number.isNaN(verified.getTime())) throw new RangeError("Invalid verification timestamp.");
  const ageMs = Math.max(0, now.getTime() - verified.getTime());
  const ageDays = Math.floor(ageMs / 86_400_000);
  const next = new Date(verified.getTime() + FRESHNESS_DAYS[category] * 86_400_000);
  return { stale: now >= next, ageDays, nextRefreshAt: next.toISOString() };
}
