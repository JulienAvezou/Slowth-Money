import { afterEach, describe, expect, it, vi } from "vitest";
import { activityFromRecommendations } from "../../src/core/activity/generateActivity";
import { evaluateSavingsOpportunity } from "../../src/core/planning/evaluateOpportunity";
import { refreshProviders } from "../../src/public-data/ingestion/refreshProviders";
import { OfficialPageSavingsAdapter } from "../../src/public-data/providers/officialPageAdapter";
import { SerpApiSearchProvider } from "../../src/public-data/search/serpApi";
import { buildPublicProductQuery } from "../../src/public-data/search/searchProvider";
import type { AccountHolding } from "../../src/shared/types/domain";

afterEach(() => vi.unstubAllGlobals());

describe("provider normalization and partial refresh", () => {
  it("normalizes official HTML and isolates a failed provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        if (url.includes("broken")) return new Response("no", { status: 503 });
        return new Response("<html><p>Interest rate is 4.25%</p></html>", { status: 200 });
      }),
    );
    const good = new OfficialPageSavingsAdapter({
      id: "good",
      provider: "Good Bank",
      productName: "Savings",
      url: "https://good.example",
      ratePattern: /rate is ([0-9.]+)%/i,
    });
    const bad = new OfficialPageSavingsAdapter({
      id: "bad",
      provider: "Bad Bank",
      productName: "Savings",
      url: "https://broken.example",
      ratePattern: /rate ([0-9.]+)%/i,
    });
    const result = await refreshProviders([good, bad]);
    expect(result.status).toBe("PARTIAL");
    expect(result.products[0]?.baseAnnualRate).toBe(0.0425);
    expect(result.failed).toHaveLength(1);
  });
});

describe("SerpApi public discovery", () => {
  it("returns normalized public results for a generic product query", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              organic_results: [
                {
                  title: "Official savings account",
                  link: "https://bank.example/savings",
                  snippet: "Public product information",
                },
              ],
            }),
            { status: 200 },
          ),
        ),
      ),
    );
    const query = buildPublicProductQuery({
      country: "Canada",
      category: "high interest savings",
      month: "2026-10",
    });

    const results = await new SerpApiSearchProvider("test-key").search(query);

    expect(results).toEqual([
      {
        title: "Official savings account",
        url: "https://bank.example/savings",
        snippet: "Public product information",
      },
    ]);
    expect(query).toBe("Canada high interest savings 2026-10 official rates");
  });

  it("treats an API-level error response as a failed SerpApi check", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "Invalid API key" }), { status: 200 }),
        ),
      ),
    );
    const query = buildPublicProductQuery({
      country: "Canada",
      category: "bank promotions",
      month: "2026-10",
    });

    await expect(new SerpApiSearchProvider("bad-key").search(query)).rejects.toThrow(
      "SerpApi rejected the request. Check the saved API key and account status.",
    );
  });
});

describe("plan evaluation and activity", () => {
  it("creates a threshold-backed activity only from verified actionable results", () => {
    const holding: AccountHolding = {
      id: "h",
      provider: "Current",
      name: "Savings",
      wrapper: "NON_REGISTERED",
      balanceCents: 5_000_000,
      annualRate: 0.02,
      promotionEndsOn: null,
    };
    const recommendation = evaluateSavingsOpportunity({
      holding,
      product: {
        id: "p",
        provider: "Official",
        productName: "HISA",
        productType: "HISA",
        baseAnnualRate: 0.05,
        promotionalAnnualRate: null,
        promotionStartsOn: null,
        promotionEndsOn: null,
        supportedWrappers: ["NON_REGISTERED"],
        monthlyFeeCents: 0,
        minimumBalanceCents: null,
        maximumPromotionalBalanceCents: null,
        newCustomerOnly: "NO",
        eligibilityNotes: null,
        lockupMonths: 0,
        provenance: {
          sourceUrl: "https://official.example",
          sourceName: "Official",
          sourceType: "FINANCIAL_INSTITUTION",
          retrievedAt: "2026-10-20T00:00:00.000Z",
          lastVerifiedAt: "2026-10-20T00:00:00.000Z",
          confidence: 0.95,
        },
      },
      thresholdCents: 5_000,
      comparisonMonths: 6,
      asOf: "2026-10-20",
    });
    expect(recommendation?.exceedsThreshold).toBe(true);
    expect(activityFromRecommendations(recommendation ? [recommendation] : []).kind).toBe(
      "OPPORTUNITY",
    );
  });
});
