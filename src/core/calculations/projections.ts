import { addMonths, wholeMonthsBetween } from "./dates";
import { roundMoney } from "./money";
import type { Goal, GoalProjection, MoneyCents } from "../../shared/types/domain";

export interface ProjectionInput {
  goal: Goal;
  monthlyContributionCents: MoneyCents | null;
  asOfDate: string;
  annualRate?: number;
}

export function projectGoal({
  goal,
  monthlyContributionCents,
  asOfDate,
  annualRate = 0,
}: ProjectionInput): GoalProjection {
  if (annualRate < 0 || annualRate > 1) throw new RangeError("Annual rate is out of range.");
  const monthsRemaining = wholeMonthsBetween(asOfDate, goal.targetDate);
  const remaining = Math.max(0, goal.targetAmountCents - goal.currentAllocatedCents);
  const progressPercent = Math.min(
    100,
    (goal.currentAllocatedCents / goal.targetAmountCents) * 100,
  );
  const requiredMonthlyCents =
    monthsRemaining === 0 ? (remaining === 0 ? 0 : null) : Math.ceil(remaining / monthsRemaining);

  if (monthlyContributionCents === null) {
    return {
      progressPercent,
      requiredMonthlyCents,
      projectedCompletionDate: null,
      projectedAmountAtTargetCents: goal.currentAllocatedCents,
      status: remaining === 0 ? "ON_TRACK" : "NEEDS_INFORMATION",
      monthsRemaining,
    };
  }

  const monthlyRate = annualRate / 12;
  let projected = goal.currentAllocatedCents;
  let completionMonth: number | null = projected >= goal.targetAmountCents ? 0 : null;
  const horizon = Math.max(monthsRemaining, 1_200);
  for (let month = 1; month <= horizon; month += 1) {
    projected = roundMoney(projected * (1 + monthlyRate) + monthlyContributionCents);
    if (completionMonth === null && projected >= goal.targetAmountCents) completionMonth = month;
    if (month === monthsRemaining) break;
  }

  const projectedAtTarget = monthsRemaining === 0 ? goal.currentAllocatedCents : projected;
  let status: GoalProjection["status"] = "ON_TRACK";
  if (projectedAtTarget < goal.targetAmountCents) status = "BEHIND";
  else if (requiredMonthlyCents !== null && monthlyContributionCents > requiredMonthlyCents)
    status = "AHEAD";

  if (completionMonth === null && monthlyContributionCents > 0) {
    let balance = projected;
    for (let month = monthsRemaining + 1; month <= 1_200; month += 1) {
      balance = roundMoney(balance * (1 + monthlyRate) + monthlyContributionCents);
      if (balance >= goal.targetAmountCents) {
        completionMonth = month;
        break;
      }
    }
  }

  return {
    progressPercent,
    requiredMonthlyCents,
    projectedCompletionDate: completionMonth === null ? null : addMonths(asOfDate, completionMonth),
    projectedAmountAtTargetCents: projectedAtTarget,
    status,
    monthsRemaining,
  };
}
