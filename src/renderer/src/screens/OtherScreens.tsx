import { formatCad } from "../../../core/calculations/money";
import type {
  FinancialProfile,
  FinancialProduct,
  GoalProjection,
} from "../../../shared/types/domain";
import { Card, PageHeader, StatusPill } from "../components/Common";

export function PlanScreen({
  profile,
  projection,
}: {
  profile: FinancialProfile;
  projection: GoalProjection;
}) {
  const unknowns = [
    profile.tfsaContributionRoomCents === null && "TFSA contribution room",
    profile.fhsaEligibility === "UNKNOWN" && "FHSA eligibility",
    profile.rrspContributionRoomCents === null && "RRSP contribution room",
  ].filter(Boolean);
  return (
    <>
      <PageHeader
        eyebrow="Your plan"
        title="A steady route to the goal"
        description="Calculations are deterministic. Guidance remains cautious where details are unknown."
      />
      <div className="two-column">
        <Card>
          <p className="eyebrow">Monthly pace</p>
          <h2>
            {profile.monthlySavingsCapacityCents === null
              ? "Needs information"
              : `${formatCad(profile.monthlySavingsCapacityCents)} per month`}
          </h2>
          <p>
            Required pace:{" "}
            {projection.requiredMonthlyCents === null
              ? "not available"
              : formatCad(projection.requiredMonthlyCents)}
            . Projected completion: {projection.projectedCompletionDate ?? "not available"}.
          </p>
        </Card>
        <Card>
          <p className="eyebrow">Liquidity</p>
          <h2>Keep near-term savings accessible</h2>
          <p>
            Your preference is {profile.liquidityRequirement.toLowerCase().replaceAll("_", " ")}.
            Products with longer lock-ups are excluded from current comparisons.
          </p>
        </Card>
        <Card className="wide unknown-card">
          <p className="eyebrow">Before wrapper guidance</p>
          <h2>
            I need {unknowns.length} more detail{unknowns.length === 1 ? "" : "s"} to be confident
          </h2>
          {unknowns.length ? (
            <ul>
              {unknowns.map((item) => (
                <li key={String(item)}>
                  {item}: <strong>Unknown</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              All material wrapper inputs have been provided. Slowth still asks you to verify them
              against official records.
            </p>
          )}
        </Card>
      </div>
    </>
  );
}

export function OpportunitiesScreen({
  products,
  scenario,
  threshold,
}: {
  products: FinancialProduct[];
  scenario: string;
  threshold: number;
}) {
  const visible = scenario === "opportunity";
  return (
    <>
      <PageHeader
        eyebrow="Worth your attention"
        title={visible ? "One possible improvement" : "No meaningful opportunities"}
        description={`Only benefits at or above ${formatCad(threshold)} interrupt you.`}
      />
      {visible && (
        <Card className="recommendation">
          <div className="recommendation-value">
            <span>Estimated benefit</span>
            <strong>+$250</strong>
            <small>over 6 months</small>
          </div>
          <div>
            <StatusPill>Above your threshold</StatusPill>
            <h2>A different savings product could improve expected interest.</h2>
            <p>Based on the demo balance and rate fixture, while keeping funds accessible.</p>
            <h3>Tradeoffs</h3>
            <ul>
              <li>Requires opening another account</li>
              <li>Promotional rate expires</li>
              <li>Eligibility is unknown and must be verified</li>
            </ul>
            <p className="disclaimer">
              Educational estimate only. Rates and eligibility are not guaranteed.
            </p>
          </div>
        </Card>
      )}
      <div className="section-title">
        <h2>Products in the local cache</h2>
        <span>
          {products.length} product{products.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="product-grid">
        {products.length === 0 ? (
          <Card>
            <h2>No cached products yet</h2>
            <p>Refresh public data when online. Local planning continues without it.</p>
          </Card>
        ) : (
          products.map((product) => (
            <Card key={product.id}>
              <p className="eyebrow">{product.provider}</p>
              <h2>{product.productName}</h2>
              <strong className="rate">
                {product.promotionalAnnualRate === null
                  ? product.baseAnnualRate === null
                    ? "Rate unknown"
                    : `${(product.baseAnnualRate * 100).toFixed(2)}%`
                  : `${(product.promotionalAnnualRate * 100).toFixed(2)}% promo`}
              </strong>
              <p>{product.eligibilityNotes}</p>
              <a href={product.provenance.sourceUrl} target="_blank" rel="noreferrer">
                Inspect official source ↗
              </a>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

export function ActivityScreen({ scenario }: { scenario: string }) {
  const entries = [
    {
      icon: "🦥",
      date: "Today",
      title: scenario === "opportunity" ? "Opportunity found" : "No action needed",
      text:
        scenario === "opportunity"
          ? "A demo comparison exceeded your $150 attention threshold."
          : "Checked cached products. Your current setup remains competitive.",
    },
    {
      icon: "✓",
      date: "October 14",
      title: "Market data reviewed",
      text: "Three public sources were evaluated independently.",
    },
    {
      icon: "📚",
      date: "October 1",
      title: "Canada rules reviewed",
      text: "No verified changes affecting this plan.",
    },
    {
      icon: "🎯",
      date: "September 28",
      title: "Milestone reached",
      text: "You crossed 40% of your home savings target.",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="Local history"
        title="Activity"
        description="A quiet, inspectable record of checks, changes, and real progress."
      />
      <Card>
        <div className="timeline">
          {entries.map((entry) => (
            <div className="timeline-item" key={entry.date + entry.title}>
              <span className="timeline-icon">{entry.icon}</span>
              <div>
                <time>{entry.date}</time>
                <h2>{entry.title}</h2>
                <p>{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export function SourcesScreen({
  products,
  freshness,
  demo,
  onRefresh,
  refreshMessage,
}: {
  products: FinancialProduct[];
  freshness: {
    products: { lastVerifiedAt: string | null; status: string };
    rules: { lastVerifiedAt: string | null; status: string };
  };
  demo: boolean;
  onRefresh: () => Promise<void>;
  refreshMessage: string;
}) {
  const display = (value: string | null) =>
    value === null
      ? "Not yet verified"
      : new Date(value).toLocaleDateString("en-CA", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  const rules = demo
    ? { lastVerifiedAt: "2026-10-20T13:00:00.000Z", status: "DEMO" }
    : freshness.rules;
  const productState = demo
    ? { lastVerifiedAt: "2026-10-20T13:00:00.000Z", status: "DEMO" }
    : freshness.products;
  return (
    <>
      <PageHeader
        eyebrow="Public information"
        title="Sources & data freshness"
        description="External services receive public queries only — never your financial profile."
        action={
          <button className="primary" onClick={() => void onRefresh()} disabled={demo}>
            Refresh products
          </button>
        }
      />
      <div className="two-column">
        <Card>
          <div className="card-top">
            <div>
              <p className="eyebrow">Canada financial rules</p>
              <h2>{display(rules.lastVerifiedAt)}</h2>
            </div>
            <StatusPill tone={rules.lastVerifiedAt ? "good" : "neutral"}>{rules.status}</StatusPill>
          </div>
          <dl className="details">
            <div>
              <dt>Refresh interval</dt>
              <dd>30 days</dd>
            </div>
            <div>
              <dt>Preferred sources</dt>
              <dd>CRA, FCAC, CDIC</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="card-top">
            <div>
              <p className="eyebrow">Financial products</p>
              <h2>{display(productState.lastVerifiedAt)}</h2>
            </div>
            <StatusPill tone={productState.lastVerifiedAt ? "good" : "neutral"}>
              {productState.status}
            </StatusPill>
          </div>
          <dl className="details">
            <div>
              <dt>Refresh interval</dt>
              <dd>7 days</dd>
            </div>
            <div>
              <dt>Cached products</dt>
              <dd>{products.length}</dd>
            </div>
          </dl>
          {refreshMessage && <p className="form-message">{refreshMessage}</p>}
        </Card>
        <Card className="wide">
          <p className="eyebrow">Privacy boundary</p>
          <h2>The internet knows products. Your Mac knows you.</h2>
          <p>
            Provider adapters retrieve only public product pages. Matching against balances, goals,
            and preferences happens locally after the public data is cached.
          </p>
        </Card>
      </div>
    </>
  );
}
