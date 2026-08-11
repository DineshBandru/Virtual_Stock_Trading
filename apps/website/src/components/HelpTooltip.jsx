import { Info } from "lucide-react";
import { guidanceHelp } from "../data/beginnerGuidance";

const HelpTooltip = ({ term, label = "Help" }) => {
  const content = guidanceHelp[term];

  if (!content) {
    return null;
  }

  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`${label}: ${content}`}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-[#080910] text-slate-500 outline-none transition hover:border-cyan/40 hover:text-cyan focus-visible:border-cyan/60 focus-visible:text-cyan focus-visible:ring-2 focus-visible:ring-cyan/20"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-[min(260px,calc(100vw-32px))] -translate-x-1/2 rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-left text-xs leading-5 text-[#C2C4D2] shadow-2xl group-hover:block group-focus-within:block"
      >
        <span className="block font-semibold text-white">{label}</span>
        <span className="mt-1 block">{content}</span>
      </span>
    </span>
  );
};

export default HelpTooltip;
