import { LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { isNavigationItemActive, navigationGroups } from "../config/navigation";

const SidebarLink = ({ item }) => {
  const location = useLocation();
  const active = isNavigationItemActive(item, location.pathname);
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      aria-current={active ? "page" : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium outline-none transition focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20 ${
        active
          ? "border-cyan/35 bg-cyan/10 text-white"
          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan" : "text-slate-500 group-hover:text-cyan"}`} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
};

const Sidebar = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="sidebar hidden min-h-0 flex-col border-r border-white/10 bg-[#0D0E18]/95 px-3 py-4 lg:flex">
      <Link
        to="/"
        className="mb-3 flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 outline-none transition hover:border-cyan/30 focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
      >
        <img
          src="/tradeabhyas-logo.png"
          alt="Trade Abhyas"
          className="h-10 w-10 shrink-0 rounded-lg object-contain"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-white">Trade Abhyas</span>
          <span className="block truncate text-xs text-slate-500">Practice. Learn. Trade smarter.</span>
        </span>
      </Link>

      <nav className="sidebar-navigation min-h-0 flex-1 pr-1" aria-label="Primary navigation">
        <div className="flex flex-col gap-5 pb-3">
          {navigationGroups.map((group) => (
            <section key={group.label}>
              <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                {group.label}
              </h2>
              <div className="mt-2 flex flex-col gap-1">
                {group.items.map((item) => (
                  <SidebarLink key={item.path} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="mt-3 shrink-0 border-t border-white/10 pt-3">
        <div className="flex flex-col gap-1">
          <Link
            to="/settings/account"
            className="mb-2 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 outline-none transition hover:border-cyan/30 focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan/30 bg-cyan/10 text-xs font-semibold uppercase text-cyan">
              {(user?.name || "U").slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">{user?.name || "Account"}</span>
              <span className="block truncate text-xs text-slate-500">My trading account</span>
            </span>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm font-medium text-red-300 outline-none transition hover:border-red-500/20 hover:bg-red-500/10 focus-visible:border-red-400/60 focus-visible:ring-2 focus-visible:ring-red-400/20"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Logout
          </button>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
