export type PageId =
  | "dashboard"
  | "advisor"
  | "profile"
  | "goal"
  | "plan"
  | "opportunities"
  | "activity"
  | "sources"
  | "settings";

const items: Array<{ id: PageId; label: string; icon: string }> = [
  { id: "dashboard", label: "Dashboard", icon: "⌂" },
  { id: "advisor", label: "Ask Slowth", icon: "✦" },
  { id: "profile", label: "Financial Profile", icon: "◉" },
  { id: "goal", label: "Goal", icon: "◎" },
  { id: "plan", label: "Plan", icon: "▤" },
  { id: "opportunities", label: "Opportunities", icon: "◇" },
  { id: "activity", label: "Activity", icon: "↻" },
  { id: "sources", label: "Sources & Data", icon: "◫" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

export function Sidebar({
  active,
  onSelect,
}: {
  active: PageId;
  onSelect: (page: PageId) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div>
          <strong>Slowth Money</strong>
          <span>Private financial planner</span>
        </div>
      </div>
      <nav aria-label="Main navigation">
        {items.map((item) => (
          <button
            className={active === item.id ? "nav-item active" : "nav-item"}
            key={item.id}
            onClick={() => onSelect(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <div className="privacy-note">
        <span className="privacy-dot" />
        <div>
          <strong>Local & private</strong>
          <small>Your financial details stay here.</small>
        </div>
      </div>
    </aside>
  );
}
