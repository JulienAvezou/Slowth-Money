import { useState } from "react";
import type { ProposedProfilePatch } from "../../../ai/schemas/profilePatch";
import { dollarsToCents, formatCad } from "../../../core/calculations/money";
import type { FinancialProfile } from "../../../shared/types/domain";
import { Card, Field, PageHeader } from "../components/Common";

function dollars(cents: number | null): string {
  return cents === null ? "" : String(cents / 100);
}

const patchLabels: Record<string, string> = {
  annualGrossIncomeCents: "Annual gross income",
  householdIncomeCents: "Household income",
  monthlyExpensesCents: "Monthly expenses",
  currentSavingsCents: "Current savings",
  emergencySavingsCents: "Emergency savings",
  monthlySavingsCapacityCents: "Monthly savings capacity",
  tfsaContributionRoomCents: "TFSA contribution room",
  fhsaEligibility: "FHSA eligibility",
  fhsaContributionRoomCents: "FHSA contribution room",
  rrspContributionRoomCents: "RRSP contribution room",
  willingnessToSwitch: "Willingness to switch",
  liquidityRequirement: "Liquidity requirement",
  maximumLockupMonths: "Maximum lock-up",
  minimumBenefitCents: "Minimum worthwhile benefit",
};

function displayPatchValue(field: string, value: unknown): string {
  if (value === null) return "Unknown";
  if (field.endsWith("Cents") && typeof value === "number") return formatCad(value);
  if (field === "maximumLockupMonths" && typeof value === "number")
    return `${value} month${value === 1 ? "" : "s"}`;
  if (typeof value === "string") return value.replaceAll("_", " ").toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "Unknown";
}

export function ProfileScreen({
  profile,
  demo,
  onSave,
}: {
  profile: FinancialProfile;
  demo: boolean;
  onSave: (profile: FinancialProfile) => Promise<void>;
}) {
  const [draft, setDraft] = useState(profile);
  const [instruction, setInstruction] = useState("");
  const [proposal, setProposal] = useState<ProposedProfilePatch | null>(null);
  const [message, setMessage] = useState("");
  const numberChange = (field: keyof FinancialProfile, value: string) =>
    setDraft({ ...draft, [field]: value === "" ? null : dollarsToCents(Number(value)) });
  const propose = async () => {
    if (demo) {
      setMessage(
        "Conversational updates are disabled in demo mode so fixture data stays separate.",
      );
      return;
    }
    setMessage("Asking your local model…");
    try {
      setProposal(await window.slowth.proposeProfilePatch(instruction));
      setMessage("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The local model could not propose changes.",
      );
    }
  };
  const apply = async () => {
    if (!proposal) return;
    const definedPatch = Object.fromEntries(
      Object.entries(proposal.patch).filter(([, value]) => value !== undefined),
    );
    const next = { ...draft, ...definedPatch } as FinancialProfile;
    setDraft(next);
    await onSave(next);
    setProposal(null);
    setInstruction("");
  };
  return (
    <>
      <PageHeader
        eyebrow="Private information"
        title="Financial profile"
        description="Encrypted on this Mac. Never sent to search providers or financial institutions."
        action={
          <button className="primary" onClick={() => void onSave(draft)} disabled={demo}>
            Save changes
          </button>
        }
      />
      <Card className="conversation-card">
        <div>
          <p className="eyebrow">Quick profile update</p>
          <h2>Tell Slowth what changed</h2>
          <p>
            This focused tool proposes profile edits for your review. Use Ask Slowth for planning
            questions and offer comparisons.
          </p>
        </div>
        <div className="conversation-input">
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="I got a raise and can save another $300 per month…"
          />
          <button onClick={() => void propose()} disabled={!instruction.trim()}>
            Review update
          </button>
        </div>
        {message && <p className="form-message">{message}</p>}
        {proposal && (
          <div className="proposal">
            <strong>Proposed changes</strong>
            {Object.keys(proposal.patch).length === 0 ? (
              <p>No safe profile change was identified.</p>
            ) : (
              <div className="proposal-changes">
                {Object.entries(proposal.patch).map(([field, value]) => (
                  <div key={field}>
                    <span>{patchLabels[field] ?? field}</span>
                    <p>
                      <s>{displayPatchValue(field, draft[field as keyof FinancialProfile])}</s>
                      <strong>→ {displayPatchValue(field, value)}</strong>
                    </p>
                  </div>
                ))}
              </div>
            )}
            <p>{proposal.rationale}</p>
            {proposal.uncertainties.length > 0 && (
              <div className="proposal-uncertainties">
                <strong>Needs clarification</strong>
                <ul>
                  {proposal.uncertainties.map((uncertainty) => (
                    <li key={uncertainty}>{uncertainty}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <button className="ghost" onClick={() => setProposal(null)}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => void apply()}
                disabled={Object.keys(proposal.patch).length === 0}
              >
                Apply changes
              </button>
            </div>
          </div>
        )}
      </Card>
      <div className="two-column">
        <Card>
          <p className="eyebrow">Jurisdiction</p>
          <h2>Where you plan</h2>
          <div className="form-grid">
            <Field label="Country">
              <input value="Canada" disabled />
            </Field>
            <Field label="Province or territory">
              <input
                value={draft.province}
                onChange={(e) => setDraft({ ...draft, province: e.target.value })}
                disabled={demo}
              />
            </Field>
            <Field label="Tax residence">
              <input
                value={draft.taxResidence}
                onChange={(e) => setDraft({ ...draft, taxResidence: e.target.value })}
                disabled={demo}
              />
            </Field>
            <Field label="Age">
              <input
                type="number"
                value={draft.age ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, age: e.target.value ? Number(e.target.value) : null })
                }
                disabled={demo}
              />
            </Field>
            <Field label="Marital status">
              <select
                value={draft.maritalStatus ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maritalStatus: (e.target.value || null) as FinancialProfile["maritalStatus"],
                  })
                }
                disabled={demo}
              >
                <option value="">Prefer not to say</option>
                <option value="SINGLE">Single</option>
                <option value="MARRIED">Married</option>
                <option value="COMMON_LAW">Common law</option>
                <option value="SEPARATED">Separated</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Field label="Dependants">
              <input
                type="number"
                min="0"
                value={draft.dependants ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, dependants: e.target.value ? Number(e.target.value) : null })
                }
                disabled={demo}
              />
            </Field>
            <Field label="Planned major life changes">
              <input
                value={draft.plannedLifeChanges ?? ""}
                onChange={(e) => setDraft({ ...draft, plannedLifeChanges: e.target.value || null })}
                placeholder="Optional"
                disabled={demo}
              />
            </Field>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Monthly picture</p>
          <h2>Cash flow</h2>
          <div className="form-grid">
            <Field label="Annual gross income">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.annualGrossIncomeCents)}
                  onChange={(e) => numberChange("annualGrossIncomeCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
            <Field label="Monthly expenses">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.monthlyExpensesCents)}
                  onChange={(e) => numberChange("monthlyExpensesCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
            <Field label="Current savings">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.currentSavingsCents)}
                  onChange={(e) => numberChange("currentSavingsCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
            <Field label="Monthly savings capacity">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.monthlySavingsCapacityCents)}
                  onChange={(e) => numberChange("monthlySavingsCapacityCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Registered accounts</p>
          <h2>Known room & eligibility</h2>
          <p className="subtle">
            Unknown is safer than a guess. Check your CRA records before entering contribution room.
          </p>
          <div className="form-grid">
            <Field label="TFSA available room" hint="Leave blank when unknown">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.tfsaContributionRoomCents)}
                  onChange={(e) => numberChange("tfsaContributionRoomCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
            <Field label="FHSA eligibility">
              <select
                value={draft.fhsaEligibility}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    fhsaEligibility: e.target.value as FinancialProfile["fhsaEligibility"],
                  })
                }
                disabled={demo}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="YES">Yes</option>
                <option value="NO">No</option>
              </select>
            </Field>
            <Field label="FHSA available room">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.fhsaContributionRoomCents)}
                  onChange={(e) => numberChange("fhsaContributionRoomCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
            <Field label="RRSP available room">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  value={dollars(draft.rrspContributionRoomCents)}
                  onChange={(e) => numberChange("rrspContributionRoomCents", e.target.value)}
                  disabled={demo}
                />
              </div>
            </Field>
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Attention threshold</p>
          <h2>HOW LAZY SHOULD I BE WITH MY MONEY?</h2>
          <div className="lazy-options">
            {[
              ["OPTIMIZER", "🐿️", "Optimizer", "$25"],
              ["RELAXED", "🦥", "Relaxed", "$150"],
              ["EXTREMELY_LAZY", "🛋️", "Extremely Lazy", "$500"],
            ].map(([mode, icon, label, threshold]) => (
              <button
                key={mode}
                className={draft.lazinessMode === mode ? "lazy-option selected" : "lazy-option"}
                onClick={() =>
                  !demo &&
                  setDraft({
                    ...draft,
                    lazinessMode: mode as FinancialProfile["lazinessMode"],
                    minimumBenefitCents:
                      mode === "OPTIMIZER" ? 2500 : mode === "RELAXED" ? 15000 : 50000,
                  })
                }
              >
                <span>{icon}</span>
                <div>
                  <strong>{label}</strong>
                  <small>Default minimum: {threshold}</small>
                </div>
              </button>
            ))}
            <button
              className={draft.lazinessMode === "CUSTOM" ? "lazy-option selected" : "lazy-option"}
              onClick={() => !demo && setDraft({ ...draft, lazinessMode: "CUSTOM" })}
            >
              <span>⚙️</span>
              <div>
                <strong>Custom</strong>
                <small>Choose your own minimum</small>
              </div>
            </button>
          </div>
          {draft.lazinessMode === "CUSTOM" && (
            <Field label="Minimum worthwhile improvement">
              <div className="money-input">
                <span>$</span>
                <input
                  type="number"
                  min="0"
                  value={dollars(draft.minimumBenefitCents)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      minimumBenefitCents: dollarsToCents(Number(e.target.value)),
                    })
                  }
                  disabled={demo}
                />
              </div>
            </Field>
          )}
        </Card>
        <Card className="wide">
          <div className="card-top">
            <div>
              <p className="eyebrow">Existing accounts</p>
              <h2>Holdings, never credentials</h2>
            </div>
            <button
              onClick={() =>
                setDraft({
                  ...draft,
                  accounts: [
                    ...draft.accounts,
                    {
                      id: crypto.randomUUID(),
                      provider: "",
                      name: "Savings account",
                      wrapper: null,
                      balanceCents: 0,
                      annualRate: null,
                      promotionEndsOn: null,
                    },
                  ],
                })
              }
              disabled={demo}
            >
              Add account
            </button>
          </div>
          {draft.accounts.length === 0 ? (
            <p className="empty-state">
              No accounts recorded. Slowth never asks for login details.
            </p>
          ) : (
            <div className="editable-list">
              {draft.accounts.map((account, index) => (
                <div className="editable-row account-row" key={account.id}>
                  <Field label="Provider">
                    <input
                      value={account.provider}
                      onChange={(e) => {
                        const accounts = [...draft.accounts];
                        accounts[index] = { ...account, provider: e.target.value };
                        setDraft({ ...draft, accounts });
                      }}
                      disabled={demo}
                    />
                  </Field>
                  <Field label="Account name">
                    <input
                      value={account.name}
                      onChange={(e) => {
                        const accounts = [...draft.accounts];
                        accounts[index] = { ...account, name: e.target.value };
                        setDraft({ ...draft, accounts });
                      }}
                      disabled={demo}
                    />
                  </Field>
                  <Field label="Wrapper">
                    <select
                      value={account.wrapper ?? ""}
                      onChange={(e) => {
                        const accounts = [...draft.accounts];
                        accounts[index] = {
                          ...account,
                          wrapper: (e.target.value || null) as typeof account.wrapper,
                        };
                        setDraft({ ...draft, accounts });
                      }}
                      disabled={demo}
                    >
                      <option value="">Unknown</option>
                      <option value="TFSA">TFSA</option>
                      <option value="FHSA">FHSA</option>
                      <option value="RRSP">RRSP</option>
                      <option value="NON_REGISTERED">Non-registered</option>
                    </select>
                  </Field>
                  <Field label="Balance">
                    <div className="money-input">
                      <span>$</span>
                      <input
                        type="number"
                        value={account.balanceCents / 100}
                        onChange={(e) => {
                          const accounts = [...draft.accounts];
                          accounts[index] = {
                            ...account,
                            balanceCents: dollarsToCents(Number(e.target.value)),
                          };
                          setDraft({ ...draft, accounts });
                        }}
                        disabled={demo}
                      />
                    </div>
                  </Field>
                  <Field label="Rate (%)">
                    <input
                      type="number"
                      step="0.01"
                      value={account.annualRate === null ? "" : account.annualRate * 100}
                      onChange={(e) => {
                        const accounts = [...draft.accounts];
                        accounts[index] = {
                          ...account,
                          annualRate: e.target.value ? Number(e.target.value) / 100 : null,
                        };
                        setDraft({ ...draft, accounts });
                      }}
                      disabled={demo}
                    />
                  </Field>
                  <button
                    className="icon-button danger"
                    aria-label={`Remove ${account.name}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        accounts: draft.accounts.filter(({ id }) => id !== account.id),
                      })
                    }
                    disabled={demo}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="card-top">
            <div>
              <p className="eyebrow">Debts</p>
              <h2>Amounts you provided</h2>
            </div>
            <button
              onClick={() =>
                setDraft({
                  ...draft,
                  debts: [
                    ...draft.debts,
                    {
                      id: crypto.randomUUID(),
                      name: "Debt",
                      balanceCents: 0,
                      annualRate: null,
                      minimumPaymentCents: null,
                    },
                  ],
                })
              }
              disabled={demo}
            >
              Add debt
            </button>
          </div>
          <div className="editable-list compact">
            {draft.debts.map((debt, index) => (
              <div className="editable-row debt-row" key={debt.id}>
                <Field label="Name">
                  <input
                    value={debt.name}
                    onChange={(e) => {
                      const debts = [...draft.debts];
                      debts[index] = { ...debt, name: e.target.value };
                      setDraft({ ...draft, debts });
                    }}
                    disabled={demo}
                  />
                </Field>
                <Field label="Balance">
                  <div className="money-input">
                    <span>$</span>
                    <input
                      type="number"
                      value={debt.balanceCents / 100}
                      onChange={(e) => {
                        const debts = [...draft.debts];
                        debts[index] = {
                          ...debt,
                          balanceCents: dollarsToCents(Number(e.target.value)),
                        };
                        setDraft({ ...draft, debts });
                      }}
                      disabled={demo}
                    />
                  </div>
                </Field>
                <button
                  className="danger"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      debts: draft.debts.filter(({ id }) => id !== debt.id),
                    })
                  }
                  disabled={demo}
                >
                  Remove
                </button>
              </div>
            ))}
            {draft.debts.length === 0 && <p className="empty-state">No debts recorded.</p>}
          </div>
        </Card>
        <Card>
          <p className="eyebrow">Preferences</p>
          <h2>Effort and access</h2>
          <div className="form-grid">
            <Field label="Willingness to switch institutions">
              <select
                value={draft.willingnessToSwitch}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    willingnessToSwitch: e.target.value as FinancialProfile["willingnessToSwitch"],
                  })
                }
                disabled={demo}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </Field>
            <Field label="Liquidity requirement">
              <select
                value={draft.liquidityRequirement}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    liquidityRequirement: e.target
                      .value as FinancialProfile["liquidityRequirement"],
                  })
                }
                disabled={demo}
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="WITHIN_30_DAYS">Within 30 days</option>
                <option value="FLEXIBLE">Flexible</option>
              </select>
            </Field>
            <Field label="Maximum lock-up (months)">
              <input
                type="number"
                min="0"
                value={draft.maximumLockupMonths}
                onChange={(e) =>
                  setDraft({ ...draft, maximumLockupMonths: Number(e.target.value) })
                }
                disabled={demo}
              />
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}
