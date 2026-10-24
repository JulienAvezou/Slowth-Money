import { useEffect, useMemo, useState } from "react";
import { projectGoal } from "../../core/calculations/projections";
import { Sidebar, type PageId } from "./components/Sidebar";
import { demoGoal, demoProducts, demoProfile, emptyGoal, emptyProfile } from "./demo";
import { Dashboard } from "./screens/Dashboard";
import { GoalScreen } from "./screens/Goal";
import {
  ActivityScreen,
  OpportunitiesScreen,
  PlanScreen,
  SourcesScreen,
} from "./screens/OtherScreens";
import { ProfileScreen } from "./screens/Profile";
import { SettingsScreen } from "./screens/Settings";
import { AdvisorScreen, type AdvisorTurn } from "./screens/Advisor";
import type { FinancialProfile, FinancialProduct, Goal } from "../../shared/types/domain";
import type { ManualPublicDataRefreshResult, PersistedState } from "../../shared/types/ipc";

type Scenario = "quiet" | "expiry" | "opportunity" | "milestone";

export function App() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [state, setState] = useState<PersistedState | null>(null);
  const [demo, setDemo] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("quiet");
  const [refreshMessage, setRefreshMessage] = useState("");
  useEffect(() => {
    void window.slowth.loadState().then((loaded) => {
      setState(loaded);
      setDemo(loaded.profile === null);
    });
  }, []);
  if (state === null)
    return (
      <div className="loading">
        <div className="sloth-orb">◕ᴥ◕</div>
        <strong>Slowth is waking up…</strong>
      </div>
    );
  const profile = demo ? demoProfile : (state.profile ?? emptyProfile());
  const goal = demo ? demoGoal : (state.goal ?? emptyGoal());
  const products = demo ? demoProducts : state.products;
  return (
    <AppLoaded
      page={page}
      setPage={setPage}
      state={state}
      setState={setState}
      demo={demo}
      setDemo={setDemo}
      scenario={scenario}
      setScenario={setScenario}
      refreshMessage={refreshMessage}
      setRefreshMessage={setRefreshMessage}
      profile={profile}
      goal={goal}
      products={products}
    />
  );
}

function AppLoaded({
  page,
  setPage,
  state,
  setState,
  demo,
  setDemo,
  scenario,
  setScenario,
  refreshMessage,
  setRefreshMessage,
  profile,
  goal,
  products,
}: {
  page: PageId;
  setPage: (page: PageId) => void;
  state: PersistedState;
  setState: (state: PersistedState) => void;
  demo: boolean;
  setDemo: (demo: boolean) => void;
  scenario: Scenario;
  setScenario: (scenario: Scenario) => void;
  refreshMessage: string;
  setRefreshMessage: (message: string) => void;
  profile: FinancialProfile;
  goal: Goal;
  products: FinancialProduct[];
}) {
  const [advisorTurns, setAdvisorTurns] = useState<AdvisorTurn[]>([]);
  const offline = !navigator.onLine;
  const projection = useMemo(
    () =>
      projectGoal({
        goal:
          scenario === "milestone"
            ? { ...goal, currentAllocatedCents: goal.targetAmountCents / 2 }
            : goal,
        monthlyContributionCents: profile.monthlySavingsCapacityCents,
        asOfDate: "2026-10-20",
        annualRate: 0.025,
      }),
    [goal, profile.monthlySavingsCapacityCents, scenario],
  );
  const saveProfile = async (next: FinancialProfile) => {
    const saved = await window.slowth.saveProfile(next);
    setState({ ...state, profile: saved });
  };
  const saveGoal = async (next: Goal) => {
    const saved = await window.slowth.saveGoal(next);
    setState({ ...state, goal: saved });
  };
  const refresh = async () => {
    setRefreshMessage("Checking official provider pages…");
    try {
      const result = await window.slowth.refreshProducts();
      const loaded = await window.slowth.loadState();
      setState(loaded);
      setRefreshMessage(
        `${result.status.toLowerCase()}: ${result.productCount} verified product records; ${result.failures} provider failures.`,
      );
    } catch (error) {
      setRefreshMessage(
        error instanceof Error ? error.message : "Refresh failed. Cached data remains available.",
      );
    }
  };
  const refreshPublicDataNow = async (): Promise<ManualPublicDataRefreshResult> => {
    const result = await window.slowth.refreshPublicDataNow();
    setState(await window.slowth.loadState());
    return result;
  };
  let content;
  if (page === "dashboard")
    content = (
      <Dashboard
        profile={profile}
        goal={goal}
        projection={projection}
        scenario={scenario}
        onReview={() => setPage("opportunities")}
      />
    );
  else if (page === "advisor")
    content = (
      <AdvisorScreen
        turns={advisorTurns}
        onTurnsChange={setAdvisorTurns}
        products={state.products}
        personalContextAvailable={state.profile !== null}
      />
    );
  else if (page === "profile")
    content = <ProfileScreen profile={profile} demo={demo} onSave={saveProfile} />;
  else if (page === "goal")
    content = <GoalScreen goal={goal} projection={projection} demo={demo} onSave={saveGoal} />;
  else if (page === "plan") content = <PlanScreen profile={profile} projection={projection} />;
  else if (page === "opportunities")
    content = (
      <OpportunitiesScreen
        products={products}
        scenario={scenario}
        threshold={profile.minimumBenefitCents}
      />
    );
  else if (page === "activity") content = <ActivityScreen scenario={scenario} />;
  else if (page === "sources")
    content = (
      <SourcesScreen
        products={products}
        freshness={state.freshness}
        demo={demo}
        onRefresh={refresh}
        refreshMessage={refreshMessage}
      />
    );
  else
    content = (
      <SettingsScreen
        initial={state.settings}
        demo={demo}
        onExitDemo={() => {
          setDemo(false);
          setPage("profile");
        }}
        onDeleted={() => {
          setState({ ...state, profile: null, goal: null });
          setDemo(true);
        }}
        onPublicDataRefresh={refreshPublicDataNow}
      />
    );
  return (
    <div className="app-shell">
      <Sidebar active={page} onSelect={setPage} />
      <main>
        {offline && (
          <div className="offline-banner">
            <strong>Offline</strong>
            <span>Using cached financial information and local calculations.</span>
          </div>
        )}
        {demo && (
          <div className="demo-banner">
            <div>
              <strong>Demo mode</strong>
              <span>Fixture data only — no real financial information</span>
            </div>
            <div className="scenario-controls">
              <span>Simulate:</span>
              <button
                className={scenario === "quiet" ? "selected" : ""}
                onClick={() => setScenario("quiet")}
              >
                No action
              </button>
              <button
                className={scenario === "expiry" ? "selected" : ""}
                onClick={() => setScenario("expiry")}
              >
                Promo expiry
              </button>
              <button
                className={scenario === "opportunity" ? "selected" : ""}
                onClick={() => setScenario("opportunity")}
              >
                +$250 opportunity
              </button>
              <button
                className={scenario === "milestone" ? "selected" : ""}
                onClick={() => setScenario("milestone")}
              >
                50% milestone
              </button>
            </div>
          </div>
        )}
        <div className="content">{content}</div>
      </main>
    </div>
  );
}
