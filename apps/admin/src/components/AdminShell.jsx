import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { adminNavigationGroups, isAdminNavigationItemActive } from "../config/navigation";
import { websiteUrl } from "../config/urls";

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
    <div className="min-h-dvh overflow-x-hidden bg-base text-white">
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

      <div className="grid min-h-[calc(100dvh-4rem)] grid-cols-1 lg:min-h-dvh lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh min-h-0 flex-col border-r border-borderGlow bg-[#0F1724] px-3 py-4 lg:flex">
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
              <a
                href={websiteUrl}
                className="rounded-lg border border-borderGlow bg-base px-4 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan/50 hover:text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20"
              >
                Website
              </a>
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
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
};

export default AdminShell;
