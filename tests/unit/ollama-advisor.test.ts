import { afterEach, describe, expect, it, vi } from "vitest";
import { OllamaClient } from "../../src/ai/ollama/client";
import { parseAdvisorReply } from "../../src/ai/schemas/advisor";
import { projectGoal } from "../../src/core/calculations/projections";
import { demoGoal, demoProducts, demoProfile } from "../../src/renderer/src/demo";

afterEach(() => vi.unstubAllGlobals());

describe("local financial advisor", () => {
  it("keeps only product references that exist in the local cache", () => {
    const reply = parseAdvisorReply(
      JSON.stringify({
        answer: "The cached offer has a promotional rate.",
        assumptions: [],
        uncertainties: [],
        referencedProductIds: [demoProducts[0]!.id, "invented-offer"],
        suggestedPrompts: [],
      }),
      new Set([demoProducts[0]!.id]),
    );

    expect(reply.referencedProductIds).toEqual([demoProducts[0]!.id]);
    expect(reply.uncertainties).toContain(
      "One or more offer references could not be matched to the local cache and were omitted.",
    );
  });

  it("sends broad planning context and a structured response contract to local Ollama", async () => {
    const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>(
      () =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              response: JSON.stringify({
                answer: "Your deterministic projection is on track.",
                assumptions: ["The projection uses 0% annual growth."],
                uncertainties: [],
                referencedProductIds: [demoProducts[0]!.id],
                suggestedPrompts: ["Compare the cached offer with my current account."],
              }),
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new OllamaClient({ baseUrl: "http://127.0.0.1:11434", model: "gemma3:12b" });
    const projection = projectGoal({
      goal: demoGoal,
      monthlyContributionCents: demoProfile.monthlySavingsCapacityCents,
      asOfDate: "2026-10-22",
      annualRate: 0,
    });

    const reply = await client.askFinancialAdvisor(
      [{ role: "user", content: "Am I on track, and what offers have you pulled?" }],
      {
        asOfDate: "2026-10-22",
        profile: demoProfile,
        goal: demoGoal,
        projection,
        products: demoProducts,
        recommendations: [],
        freshness: {
          products: { lastVerifiedAt: "2026-10-20T13:00:00.000Z", status: "SUCCESS" },
          rules: { lastVerifiedAt: "2026-10-20T13:00:00.000Z", status: "SUCCESS" },
        },
      },
    );

    expect(reply.answer).toContain("on track");
    expect(reply.referencedProductIds).toEqual([demoProducts[0]!.id]);
    const request = fetchMock.mock.calls[0];
    const init = request?.[1];
    if (init === undefined) throw new Error("Expected Ollama request options.");
    if (typeof init.body !== "string") throw new Error("Expected a string request body.");
    const body = JSON.parse(init.body) as { prompt: string; format: { type: string } };
    expect(body.format.type).toBe("object");
    expect(body.prompt).toContain("Answer the user's actual question directly");
    expect(body.prompt).toContain(demoProducts[0]!.productName);
    expect(body.prompt).toContain('"currency":"CAD"');
  });

  it("rejects malformed model output with a controlled error", () => {
    expect(() => parseAdvisorReply('{"answer":42}', new Set())).toThrow(
      "The local model returned an invalid response. Please try again.",
    );
  });
});
