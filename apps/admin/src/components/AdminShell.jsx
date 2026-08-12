import { useEffect, useState } from "react";
import { Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { adminNavigationGroups, isAdminNavigationItemActive } from "../config/navigation";
import { websiteUrl } from "../config/urls";

const getStoredThemePreference = () => {
  if (typeof window === "undefined") return "system";
  return window.localStorage.getItem("themePreference") || window.localStorage.getItem("theme") || "system";
};

const getSystemTheme = () => {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const themeOptions = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon }
];

const ThemeSwitcher = ({ compact = false }) => {
  const [themePreference, setThemePreference] = useState(getStoredThemePreference);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);
  const resolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    window.localStorage.setItem("themePreference", themePreference);
    window.localStorage.setItem("theme", themePreference);
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setSystemTheme(media.matches ? "dark" : "light");
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className={compact ? "grid grid-cols-3 gap-1 rounded-lg border border-borderGlow bg-base p-1" : "rounded-xl border border-borderGlow bg-base p-2"}>
      {!compact ? <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Appearance</p> : null}
      <div className={compact ? "contents" : "grid grid-cols-3 gap-1"}>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const active = themePreference === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setThemePreference(option.id)}
              aria-label={`Use ${option.label.toLowerCase()} mode`}
              title={`${option.label} mode`}
              className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-cyan/20 ${
                active ? "bg-cyan text-slate-950" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {!compact ? <span>{option.label}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const AdminNavItem = ({ item, onNavigate }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const active = isAdminNavigationItemActive(item, location.pathname);
  const Icon = item.icon;
  const baseClass = `flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm font-medium outline-none transition focus-visible:ring-2 ${
    item.destructive
      ? "border-transparent text-red-300 hover:border-red-500/20 hover:bg-red-500/10 focus-visible:border-red-400/60 focus-visible:ring-red-400/20"
      : active
        ? "border-cyan/35 bg-cyan/10 text-white focus-visible:border-cyan/60 focus-visible:ring-cyan/20"
        : "border-transparent text-slate-400 hover:border-borderGlow hover:bg-white/[0.04] hover:text-white focus-visible:border-cyan/60 focus-visible:ring-cyan/20"
  }`;

  const content = (
    <>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan" : item.destructive ? "text-red-300" : "text-slate-500"}`} aria-hidden="true" />
      <span>{item.label}</span>
    </>
  );

  if (item.external) {
    return (
      <a href={item.path} className={baseClass} onClick={onNavigate}>
        {content}
      </a>
    );
  }

  if (item.action === "logout") {
    return (
      <button
        type="button"
        className={baseClass}
        onClick={async () => {
          onNavigate?.();
          await logout();
          navigate("/login", { replace: true });
        }}
      >
        {content}
      </button>
    );
  }

  return (
    <Link to={item.path} className={baseClass} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      {content}
    </Link>
  );
};

const AdminNavigation = ({ onNavigate }) => (
  <nav className="min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Admin navigation">
    <div className="flex flex-col gap-5 pb-3">
      {adminNavigationGroups.map((group) => (
        <section key={group.label}>
          <h2 className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            {group.label}
          </h2>
          <div className="mt-2 flex flex-col gap-1">
            {group.items.map((item) => (
              <AdminNavItem key={item.path || item.action} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ))}
    </div>
  </nav>
);

const AdminShell = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [drawerOpen]);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-base text-white lg:pl-[248px]">
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-borderGlow bg-[#0F1724]/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-3">
          <img src="/tradeabhyas-logo.png" alt="Trade Abhyas" className="h-10 w-10 rounded-lg object-contain" />
          <div>
          <p className="text-xs font-semibold uppercase text-cyan">Trade Abhyas Admin</p>
          <h1 className="text-base font-semibold text-white">Trade Abhyas Control</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin navigation"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-borderGlow bg-base text-slate-200 outline-none transition hover:border-cyan/40 hover:text-cyan focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-[calc(100dvh-4rem)] lg:min-h-dvh">
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] min-h-0 flex-col border-r border-borderGlow bg-[#0F1724] px-3 py-4 lg:flex">
          <Link
            to="/"
            className="mb-3 flex shrink-0 items-center gap-3 rounded-xl border border-borderGlow bg-base px-3 py-3 outline-none transition hover:border-cyan/30 focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
          >
            <img
              src="/tradeabhyas-logo.png"
              alt="Trade Abhyas"
              className="h-10 w-10 shrink-0 rounded-lg object-contain"
            />
            <span>
              <span className="block text-sm font-semibold text-white">Trade Abhyas Admin</span>
              <span className="block text-xs text-slate-500">Operations center</span>
            </span>
          </Link>

          <AdminNavigation />

          <div className="mt-3 shrink-0">
            <ThemeSwitcher />
          </div>

          <div className="mt-3 shrink-0 border-t border-borderGlow px-3 pt-3 text-xs leading-5 text-slate-500">
            Role-protected workspace
          </div>
        </aside>

        <main className="min-w-0 overflow-x-hidden px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <header className="hidden flex-wrap items-center justify-between gap-4 rounded-xl border border-borderGlow bg-panel px-5 py-4 lg:flex">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Management Workspace</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Trade Abhyas Platform Control</h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <ThemeSwitcher compact />
                <a
                  href={websiteUrl}
                  className="rounded-lg border border-borderGlow bg-base px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan/50 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20"
                >
                  Website
                </a>
              </div>
            </header>
            {children}
          </div>
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close admin navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative flex h-dvh w-[min(360px,calc(100vw-32px))] max-w-full flex-col border-r border-borderGlow bg-[#0F1724] shadow-2xl" aria-label="Admin mobile navigation">
            <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-borderGlow px-4">
              <div className="flex items-center gap-3">
                <img src="/tradeabhyas-logo.png" alt="Trade Abhyas" className="h-10 w-10 rounded-lg object-contain" />
                <div>
                  <p className="text-xs font-semibold uppercase text-cyan">Trade Abhyas Admin</p>
                  <h2 className="text-base font-semibold text-white">Navigation</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close admin navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-borderGlow bg-base text-slate-200 outline-none transition hover:border-cyan/40 hover:text-cyan focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
              <AdminNavigation onNavigate={() => setDrawerOpen(false)} />
              <div className="mt-3">
                <ThemeSwitcher />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default AdminShell;
