import type { Recommendation } from "../../shared/types/domain";

export interface ActivityItem {
  kind: "OPPORTUNITY" | "NO_ACTION" | "REFRESH";
  title: string;
  summary: string;
}

export function activityFromRecommendations(recommendations: Recommendation[]): ActivityItem {
  const actionable = recommendations.filter((recommendation) => recommendation.exceedsThreshold);
  if (actionable.length === 0) {
    return {
      kind: "NO_ACTION",
      title: "No action needed",
      summary:
        "Checked current products. No verified opportunity exceeded your attention threshold.",
    };
  }
  return {
    kind: "OPPORTUNITY",
    title:
      actionable.length === 1 ? "Opportunity found" : `${actionable.length} opportunities found`,
    summary: "At least one verified estimate exceeded your attention threshold.",
  };
}
