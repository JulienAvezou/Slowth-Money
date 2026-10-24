import { describe, expect, it } from "vitest";
import { evaluateFreshness } from "../../src/core/freshness/freshness";
import { detectProgressEvents } from "../../src/core/progress/milestones";
import { selectMostTrustedSource } from "../../src/public-data/trust/selectSource";
import type { SourceProvenance } from "../../src/shared/types/domain";

function source(sourceType: SourceProvenance["sourceType"], name: string): SourceProvenance {
  return {
    sourceUrl: `https://example.com/${name}`,
    sourceName: name,
    sourceType,
    retrievedAt: "2026-10-01T00:00:00.000Z",
    lastVerifiedAt: "2026-10-01T00:00:00.000Z",
    confidence: sourceType === "GOVERNMENT_REGULATOR" ? 1 : 0.95,
  };
}

describe("freshness", () => {
  it("marks missing data stale", () =>
    expect(
      evaluateFreshness("FINANCIAL_PRODUCTS", null, new Date("2026-10-20T00:00:00Z")).stale,
    ).toBe(true));
  it("uses different product and rule intervals", () => {
    expect(
      evaluateFreshness(
        "FINANCIAL_PRODUCTS",
        "2026-10-10T00:00:00Z",
        new Date("2026-10-20T00:00:00Z"),
      ).stale,
    ).toBe(true);
    expect(
      evaluateFreshness("COUNTRY_RULES", "2026-10-10T00:00:00Z", new Date("2026-10-20T00:00:00Z"))
        .stale,
    ).toBe(false);
  });
});

describe("progress milestones", () => {
  it("emits every newly crossed ten-percent boundary and ahead state", () => {
    const events = detectProgressEvents(
      { capturedAt: "a", allocatedCents: 390, targetCents: 1000, status: "ON_TRACK" },
      { capturedAt: "b", allocatedCents: 510, targetCents: 1000, status: "AHEAD" },
    );
    expect(events).toEqual([
      { type: "PERCENT_MILESTONE", percent: 40 },
      { type: "PERCENT_MILESTONE", percent: 50 },
      { type: "BECAME_AHEAD" },
    ]);
  });
});

describe("source trust", () => {
  it("prefers government and flags conflicting high-trust facts", () => {
    const result = selectMostTrustedSource([
      { provenance: source("FINANCIAL_INSTITUTION", "bank"), value: 0.04 },
      { provenance: source("GOVERNMENT_REGULATOR", "regulator"), value: 0.03 },
    ]);
    expect(result.selected?.sourceName).toBe("regulator");
    expect(result.conflict).toBe(true);
  });
});
