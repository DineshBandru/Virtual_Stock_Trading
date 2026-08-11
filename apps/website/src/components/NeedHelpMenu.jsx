import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronDown, HelpCircle, MousePointerClick, PlayCircle, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { firstTradeGuideEventName, replayTourEventName } from "../data/beginnerGuidance";

const helpItems = [
  { label: "Trading Guide", to: "/trading-guide", icon: BookOpen },
  { label: "Order Types", to: "/trading-guide#order-types", icon: HelpCircle },
  { label: "Understand P&L", to: "/trading-guide#pnl", icon: TrendingUp }
];

const NeedHelpMenu = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const replayTour = () => {
    setOpen(false);
    onNavigate?.();
    window.dispatchEvent(new CustomEvent(replayTourEventName));
  };

  const startFirstTradeGuide = () => {
    setOpen(false);
    onNavigate?.();
    window.dispatchEvent(new CustomEvent(firstTradeGuideEventName));
  };

  const closeAfterNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-sm font-medium text-slate-300 outline-none transition hover:border-cyan/30 hover:text-cyan focus-visible:border-cyan/60 focus-visible:ring-2 focus-visible:ring-cyan/20"
      >
        <span className="inline-flex items-center gap-3">
          <HelpCircle className="h-4 w-4" aria-hidden="true" />
          Need Help?
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-full min-w-[220px] rounded-lg border border-white/10 bg-[#0D0E18] p-2 shadow-2xl"
        >
          {helpItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                role="menuitem"
                onClick={closeAfterNavigate}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none transition hover:bg-white/[0.04] hover:text-cyan focus-visible:bg-white/[0.04] focus-visible:text-cyan"
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            role="menuitem"
            onClick={startFirstTradeGuide}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 outline-none transition hover:bg-white/[0.04] hover:text-cyan focus-visible:bg-white/[0.04] focus-visible:text-cyan"
          >
            <MousePointerClick className="h-4 w-4" aria-hidden="true" />
            First Virtual Trade
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={replayTour}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-300 outline-none transition hover:bg-white/[0.04] hover:text-cyan focus-visible:bg-white/[0.04] focus-visible:text-cyan"
          >
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Replay Trading Tour
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default NeedHelpMenu;
