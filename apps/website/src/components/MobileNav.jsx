import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { isNavigationItemActive, navigationGroups } from "../config/navigation";
import NeedHelpMenu from "./NeedHelpMenu";

const MobileDrawerLink = ({ item, onNavigate }) => {
  const location = useLocation();
  const active = isNavigationItemActive(item, location.pathname);
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium outline-none transition focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20 ${
        active
          ? "border-cyan/35 bg-cyan/10 text-white"
          : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-cyan" : "text-slate-500"}`} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
};

const MobileNav = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleLogout = async () => {
    close();
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-white/10 bg-[#0D0E18]/95 px-4 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-cyan/20">
          <img
            src="/tradeabhyas-logo.png"
            alt="Trade Abhyas"
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          <span>
            <span className="block text-sm font-semibold text-white">Trade Abhyas</span>
            <span className="block text-xs text-slate-500">Trading Platform</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 outline-none transition hover:border-cyan/40 hover:text-cyan focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[80] lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close navigation menu"
            onClick={close}
          />
          <aside
            className="relative flex h-dvh w-[min(360px,calc(100vw-32px))] max-w-full flex-col border-r border-white/10 bg-[#0D0E18] shadow-2xl"
            aria-label="Mobile navigation"
          >
            <div className="flex min-h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <div className="flex items-center gap-3">
                <img src="/tradeabhyas-logo.png" alt="Trade Abhyas" className="h-10 w-10 rounded-lg object-contain" />
                <div>
                  <p className="text-xs font-semibold uppercase text-amber">Trade Abhyas</p>
                  <h2 className="text-base font-semibold text-white">Navigation</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close navigation menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-200 outline-none transition hover:border-cyan/40 hover:text-cyan focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-label="Primary navigation">
              <div className="flex flex-col gap-5">
                {navigationGroups.map((group) => (
                  <section key={group.label}>
                    <h3 className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {group.label}
                    </h3>
                    <div className="mt-2 flex flex-col gap-1">
                      {group.items.map((item) => (
                        <MobileDrawerLink key={item.path} item={item} onNavigate={close} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </nav>

            <div className="shrink-0 border-t border-white/10 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
              <NeedHelpMenu onNavigate={close} />
              <button
                type="button"
                onClick={handleLogout}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm font-medium text-red-300 outline-none transition hover:border-red-500/20 hover:bg-red-500/10 focus-visible:border-red-400/60 focus-visible:ring-2 focus-visible:ring-red-400/20"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
};

export default MobileNav;
