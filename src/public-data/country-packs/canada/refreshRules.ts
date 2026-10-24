import { canadaCountryPack } from "./index";

export interface RuleRefreshResult {
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  succeeded: number;
  failed: string[];
}

export async function verifyCanadaRuleSources(signal?: AbortSignal): Promise<RuleRefreshResult> {
  const results = await Promise.allSettled(
    canadaCountryPack.concepts.map(async (concept) => {
      const response = await fetch(concept.authoritativeUrl, {
        headers: { "user-agent": "Slowth-Money/0.1 public-rule-check" },
        ...(signal === undefined ? {} : { signal }),
      });
      if (!response.ok) throw new Error(`${concept.label}: HTTP ${response.status}`);
      const body = await response.text();
      if (body.length < 200) throw new Error(`${concept.label}: response was unexpectedly empty`);
      return concept.id;
    }),
  );
  const failed = results.flatMap((result) =>
    result.status === "rejected"
      ? [result.reason instanceof Error ? result.reason.message : "Unknown rule-source failure"]
      : [],
  );
  const succeeded = results.length - failed.length;
  return {
    status: failed.length === 0 ? "SUCCESS" : succeeded === 0 ? "FAILED" : "PARTIAL",
    succeeded,
    failed,
  };
}
