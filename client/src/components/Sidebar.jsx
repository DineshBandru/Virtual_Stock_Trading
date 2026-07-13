import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { usePracticeMode } from "../context/PracticeModeContext";

const navItems = [
  { path: "/", label: "Dashboard" },
  { path: "/portfolio", label: "Portfolio" },
  { path: "/positions", label: "Positions" },
  { path: "/transactions", label: "Transactions" },
  { path: "/orders", label: "Orders" },
  { path: "/watchlist", label: "Watchlist" },
  { path: "/alerts", label: "Alerts" },
  { path: "/analytics", label: "Analytics" },
  { path: "/leaderboard", label: "Leaderboard" },
  { path: "/competitions", label: "Competitions" }
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isCompetitionMode, toggleMode } = usePracticeMode();

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
                  : "text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {user?.role === "admin" ? (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `rounded-xl px-4 py-2 text-sm font-semibold transition ${
                isActive
                  ? "border border-amber/70 bg-amber/10 text-amber shadow-glowAmber"
                  : "text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white"
              }`
            }
          >
            Admin
          </NavLink>
        ) : null}
      </nav>

      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={toggleTheme}
          className="text-left text-sm font-semibold text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white px-4 py-2"
        >
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <button
          onClick={toggleMode}
          className="text-left text-sm font-semibold text-slate-500 dark:text-slate-300 hover:text-black dark:hover:text-white px-4 py-2"
        >
          {isCompetitionMode ? "Competition Mode" : "Practice Mode"}
        </button>

        <button
          onClick={logout}
          className="text-left text-sm font-semibold text-red-500 hover:text-red-400 px-4 py-2"
        >
          Logout
        </button>
      </div>

      <div className="mt-auto rounded-xl border border-borderGlow/60 bg-base/70 p-4 text-xs text-slate-400">
        Admin route: /admin
      </div>
    </aside>
  );
};

export default Sidebar;
