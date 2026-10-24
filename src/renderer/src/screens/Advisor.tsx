import { useState, type FormEvent } from "react";
import type { AdvisorMessage, AdvisorReply } from "../../../ai/schemas/advisor";
import type { FinancialProduct } from "../../../shared/types/domain";
import { Card, PageHeader } from "../components/Common";

export interface AdvisorTurn {
  id: string;
  question: string;
  reply: AdvisorReply;
}

const starterPrompts = [
  "Am I on track for my goal?",
  "Compare the savings offers currently in the local cache.",
  "What important information is missing from my financial plan?",
  "How should I think about my emergency fund?",
];

export function AdvisorScreen({
  turns,
  onTurnsChange,
  products,
  personalContextAvailable,
}: {
  turns: AdvisorTurn[];
  onTurnsChange: (turns: AdvisorTurn[]) => void;
  products: FinancialProduct[];
  personalContextAvailable: boolean;
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ask = async (prompt: string) => {
    const question = prompt.trim();
    if (!question || busy) return;
    setBusy(true);
    setError("");
    try {
      const history: AdvisorMessage[] = turns.slice(-5).flatMap((turn) => [
        { role: "user", content: turn.question },
        { role: "assistant", content: turn.reply.answer },
      ]);
      const reply = await window.slowth.askFinancialAdvisor([
        ...history,
        { role: "user", content: question },
      ]);
      onTurnsChange([...turns, { id: crypto.randomUUID(), question, reply }]);
      setInput("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The local assistant could not answer this question.",
      );
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void ask(input);
  };

  return (
    <>
      <PageHeader
        eyebrow="Local financial guidance"
        title="Ask Slowth"
        description="Explore your plan and the offers cached on this Mac. Gemma runs locally; public providers never receive your personal context."
        action={
          turns.length > 0 ? (
            <button onClick={() => onTurnsChange([])} disabled={busy}>
              Clear conversation
            </button>
          ) : undefined
        }
      />
      <div className="advisor-layout">
        <Card className="advisor-card">
          {!personalContextAvailable && (
            <div className="advisor-context-note">
              <strong>No saved personal profile is active.</strong>
              <span>
                You can ask general questions, but personalized planning needs a saved profile and
                goal.
              </span>
            </div>
          )}

          <div className="advisor-thread" aria-live="polite">
            {turns.length === 0 ? (
              <div className="advisor-welcome">
                <div className="sloth-orb" aria-hidden="true">
                  ◕ᴥ◕
                </div>
                <h2>What would you like to work through?</h2>
                <p>
                  Ask about your goal, cash flow, registered accounts, tradeoffs, or any verified
                  savings offers in the local cache.
                </p>
                <div className="advisor-suggestions">
                  {starterPrompts.map((prompt) => (
                    <button key={prompt} onClick={() => void ask(prompt)} disabled={busy}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              turns.map((turn) => (
                <AdvisorTurnView
                  key={turn.id}
                  turn={turn}
                  products={products}
                  setInput={setInput}
                />
              ))
            )}
            {busy && (
              <div className="advisor-message assistant loading-message">
                <span className="advisor-avatar">S</span>
                <p>Slowth is thinking with your local context…</p>
              </div>
            )}
          </div>

          {error && <p className="form-message advisor-error">{error}</p>}
          <form className="advisor-composer" onSubmit={submit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about your plan, a tradeoff, or the offers Slowth has pulled…"
              rows={3}
              maxLength={4_000}
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void ask(input);
                }
              }}
            />
            <div>
              <span>⌘ Enter to send · conversation is not saved</span>
              <button className="primary" type="submit" disabled={busy || !input.trim()}>
                {busy ? "Thinking…" : "Ask Slowth"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

function AdvisorTurnView({
  turn,
  products,
  setInput,
}: {
  turn: AdvisorTurn;
  products: FinancialProduct[];
  setInput: (value: string) => void;
}) {
  const referencedProducts = turn.reply.referencedProductIds.flatMap((id) => {
    const product = products.find((candidate) => candidate.id === id);
    return product === undefined ? [] : [product];
  });
  return (
    <div className="advisor-turn">
      <div className="advisor-message user">
        <p>{turn.question}</p>
      </div>
      <div className="advisor-message assistant">
        <span className="advisor-avatar">S</span>
        <div>
          <p className="advisor-answer">{turn.reply.answer}</p>
          {turn.reply.assumptions.length > 0 && (
            <AdvisorList title="Assumptions used" items={turn.reply.assumptions} />
          )}
          {turn.reply.uncertainties.length > 0 && (
            <AdvisorList title="What remains uncertain" items={turn.reply.uncertainties} warm />
          )}
          {referencedProducts.length > 0 && (
            <div className="advisor-sources">
              <strong>Offers referenced</strong>
              {referencedProducts.map((product) => (
                <div key={product.id}>
                  <span>
                    {product.provider} · {product.productName}
                  </span>
                  <small>
                    Verified{" "}
                    {new Date(product.provenance.lastVerifiedAt).toLocaleDateString("en-CA")}
                  </small>
                  <a href={product.provenance.sourceUrl} target="_blank" rel="noreferrer">
                    Official source ↗
                  </a>
                </div>
              ))}
            </div>
          )}
          {turn.reply.suggestedPrompts.length > 0 && (
            <div className="advisor-followups">
              {turn.reply.suggestedPrompts.map((prompt) => (
                <button key={prompt} onClick={() => setInput(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdvisorList({
  title,
  items,
  warm = false,
}: {
  title: string;
  items: string[];
  warm?: boolean;
}) {
  return (
    <div className={warm ? "advisor-detail warm" : "advisor-detail"}>
      <strong>{title}</strong>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
