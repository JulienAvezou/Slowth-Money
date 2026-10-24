export interface GoalSnapshot {
  capturedAt: string;
  allocatedCents: number;
  targetCents: number;
  status: "AHEAD" | "ON_TRACK" | "BEHIND" | "NEEDS_INFORMATION";
}

export type ProgressEvent =
  | { type: "PERCENT_MILESTONE"; percent: number }
  | { type: "BECAME_AHEAD" }
  | { type: "GOAL_COMPLETED" };

export function detectProgressEvents(
  previous: GoalSnapshot,
  current: GoalSnapshot,
): ProgressEvent[] {
  const events: ProgressEvent[] = [];
  const previousPercent = Math.floor((previous.allocatedCents / previous.targetCents) * 100);
  const currentPercent = Math.floor((current.allocatedCents / current.targetCents) * 100);
  for (let percent = 10; percent <= 90; percent += 10) {
    if (previousPercent < percent && currentPercent >= percent) {
      events.push({ type: "PERCENT_MILESTONE", percent });
    }
  }
  if (previousPercent < 100 && currentPercent >= 100) events.push({ type: "GOAL_COMPLETED" });
  if (previous.status !== "AHEAD" && current.status === "AHEAD")
    events.push({ type: "BECAME_AHEAD" });
  return events;
}
