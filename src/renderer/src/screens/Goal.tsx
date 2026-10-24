import { useState } from "react";
import { dollarsToCents, formatCad } from "../../../core/calculations/money";
import type { Goal, GoalProjection } from "../../../shared/types/domain";
import { Card, Field, PageHeader, StatusPill } from "../components/Common";

export function GoalScreen({
  goal,
  projection,
  demo,
  onSave,
}: {
  goal: Goal;
  projection: GoalProjection;
  demo: boolean;
  onSave: (goal: Goal) => Promise<void>;
}) {
  const [draft, setDraft] = useState(goal);
  return (
    <>
      <PageHeader
        eyebrow="One primary goal"
        title={goal.name}
        description="A deterministic projection based on the values you provided."
        action={
          <button className="primary" onClick={() => void onSave(draft)} disabled={demo}>
            Save goal
          </button>
        }
      />
      <div className="two-column">
        <Card className="goal-hero">
          <div className="card-top">
            <div>
              <p className="eyebrow">Progress</p>
              <h2>{Math.round(projection.progressPercent)}% complete</h2>
            </div>
            <StatusPill tone={projection.status === "BEHIND" ? "warm" : "good"}>
              {projection.status.replace("_", " ").toLowerCase()}
            </StatusPill>
          </div>
          <div className="progress-track large">
            <span style={{ width: `${projection.progressPercent}%` }} />
          </div>
          <div className="goal-amount">
            <strong>{formatCad(goal.currentAllocatedCents)}</strong>
            <span>of {formatCad(goal.targetAmountCents)}</span>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Projection</p>
          <h2>What the numbers say</h2>
          <dl className="details">
            <div>
              <dt>Required monthly savings</dt>
              <dd>
                {projection.requiredMonthlyCents === null
                  ? "Not available"
                  : formatCad(projection.requiredMonthlyCents)}
              </dd>
            </div>
            <div>
              <dt>Projected at target</dt>
              <dd>{formatCad(projection.projectedAmountAtTargetCents)}</dd>
            </div>
            <div>
              <dt>Projected completion</dt>
              <dd>{projection.projectedCompletionDate ?? "Needs information"}</dd>
            </div>
          </dl>
        </Card>
        <Card className="wide">
          <p className="eyebrow">Goal details</p>
          <div className="form-grid four">
            <Field label="Goal name">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                disabled={demo}
              />
            </Field>
            <Field label="Goal type">
              <select
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as Goal["kind"] })}
                disabled={demo}
              >
                <option value="HOME_DOWN_PAYMENT">Home down payment</option>
                <option value="EMERGENCY_FUND">Emergency fund</option>
                <option value="MAJOR_PURCHASE">Major purchase</option>
                <option value="EDUCATION">Education</option>
                <option value="GENERAL">General savings</option>
              </select>
            </Field>
            <Field label="Target amount">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={draft.targetAmountCents / 100}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      targetAmountCents: dollarsToCents(Number(e.target.value)),
                    })
                  }
                  disabled={demo}
                />
              </div>
            </Field>
            <Field label="Target date">
              <input
                type="date"
                value={draft.targetDate}
                onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
                disabled={demo}
              />
            </Field>
            <Field label="Currently allocated">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={draft.currentAllocatedCents / 100}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currentAllocatedCents: dollarsToCents(Number(e.target.value)),
                    })
                  }
                  disabled={demo}
                />
              </div>
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}
