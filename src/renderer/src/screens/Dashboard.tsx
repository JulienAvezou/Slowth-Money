import { formatCad } from "../../../core/calculations/money";
import type { FinancialProfile, Goal, GoalProjection } from "../../../shared/types/domain";
import { Card, PageHeader, StatusPill } from "../components/Common";

export function Dashboard({
  profile,
  goal,
  projection,
  scenario,
  onReview,
}: {
  profile: FinancialProfile;
  goal: Goal;
  projection: GoalProjection;
  scenario: string;
  onReview: () => void;
}) {
  const opportunity = scenario === "opportunity";
  return (
    <>
      <PageHeader
        eyebrow="Tuesday, October 20"
        title="Good afternoon."
        description="Here’s the quiet version of what’s happening with your money."
      />
      <div className="dashboard-grid">
        <Card className="goal-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">Your goal</p>
              <h2>{goal.name}</h2>
            </div>
            <StatusPill>
              {projection.status === "BEHIND" ? "Needs attention" : "On track"}
            </StatusPill>
          </div>
          <div className="goal-amount">
            <strong>{formatCad(goal.currentAllocatedCents)}</strong>
            <span>of {formatCad(goal.targetAmountCents)}</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${Math.min(100, projection.progressPercent)}%` }} />
          </div>
          <div className="metric-row">
            <div>
              <span>Progress</span>
              <strong>{Math.round(projection.progressPercent)}%</strong>
            </div>
            <div>
              <span>Target date</span>
              <strong>June 2029</strong>
            </div>
            <div>
              <span>Monthly pace</span>
              <strong>
                {profile.monthlySavingsCapacityCents === null
                  ? "Unknown"
                  : formatCad(profile.monthlySavingsCapacityCents)}
              </strong>
            </div>
          </div>
          <p className="subtle">
            At this pace, your projected balance at the target date is{" "}
            {formatCad(projection.projectedAmountAtTargetCents)}.
          </p>
        </Card>
        <Card className="agent-card">
          <div className="sloth-orb" aria-hidden="true">
            ◕ᴥ◕
          </div>
          <p className="eyebrow">Your agent</p>
          <h2>
            {opportunity
              ? "One thing may be worth your attention."
              : "Relax. Nothing needs your attention."}
          </h2>
          <p>
            {opportunity
              ? "A demo savings offer could improve expected interest by about $250 over six months."
              : "Slowth checked your plan. Your current setup is still competitive based on cached information."}
          </p>
          {opportunity && (
            <button className="primary" onClick={onReview}>
              Review recommendation
            </button>
          )}
        </Card>
        <Card className="review-card">
          <div className="card-top">
            <div>
              <p className="eyebrow">Last financial review</p>
              <h2>Today at 9:42 AM</h2>
            </div>
            <span className="check">✓</span>
          </div>
          <div className="review-stats">
            <div>
              <strong>3</strong>
              <span>products evaluated</span>
            </div>
            <div>
              <strong>4</strong>
              <span>rules checked</span>
            </div>
            <div>
              <strong>0</strong>
              <span>actions required</span>
            </div>
          </div>
        </Card>
        <Card className="next-card">
          <p className="eyebrow">Next quiet check</p>
          <h2>In 7 days</h2>
          <p>Slowth will wait until product information is due. No continuous polling.</p>
        </Card>
      </div>
    </>
  );
}
