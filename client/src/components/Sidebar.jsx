import { NavLink } from "react-router-dom";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/portfolio", label: "Portfolio" },
  { path: "/transactions", label: "Transactions" },
  { path: "/watchlist", label: "Watchlist" },
  { path: "/alerts", label: "Alerts" },
  { path: "/analytics", label: "Analytics" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/competitions", label: "Competitions" }
];

const Sidebar = () => {
  return (
    <aside className="hidden h-full flex-col gap-8 border-r border-borderGlow/50 bg-panel/70 px-6 py-10 lg:flex">
      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-cyan">
          VSTP
        </span>
        <span className="font-heading text-xl">Neon Terminal</span>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border border-cyan/70 bg-cyan/10 text-cyan shadow-glow"
                  : "text-slate-300 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-borderGlow/60 bg-base/70 p-4 text-xs text-slate-400">
        Admin route: /admin
      </div>
    </aside>
  );
};

export default Sidebar;
