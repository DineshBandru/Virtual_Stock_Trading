import { NavLink } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Home, PieChart, LayoutList, Trophy, ListOrdered, Activity } from "lucide-react";

const navItems = [
  { path: "/", label: "Home", icon: Home },
  { path: "/orders", label: "Orders", icon: ListOrdered },
  { path: "/portfolio", label: "Portfolio", icon: PieChart },
  { path: "/positions", label: "Positions", icon: Activity },
  { path: "/watchlist", label: "Watchlist", icon: LayoutList },
  { path: "/leaderboard", label: "Ranks", icon: Trophy }
];

const MobileNav = () => {
  const { user } = useAuth();
  const items = user?.role === "admin"
    ? [...navItems, { path: "/admin", label: "Admin", icon: Trophy }]
    : navItems;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-borderGlow/50 bg-panel/90 px-4 py-3 backdrop-blur-md lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 text-xs transition-colors ${
                isActive ? "text-cyan" : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileNav;