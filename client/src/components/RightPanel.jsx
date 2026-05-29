import GlassPanel from "./GlassPanel";

const RightPanel = () => {
  return (
    <aside className="hidden h-full flex-col gap-6 border-l border-borderGlow/50 bg-panel/60 px-6 py-10 xl:flex">
      <GlassPanel className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Watchlist
        </h3>
        <p className="text-xs text-slate-400">
          Live watchlist will appear once you add symbols.
        </p>
      </GlassPanel>

      <GlassPanel className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Market News
        </h3>
        <p className="text-xs text-slate-400">
          News feed connects to Finnhub / News API.
        </p>
      </GlassPanel>

      <GlassPanel className="mt-auto space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Alerts
        </h3>
        <p className="text-xs text-slate-400">
          Price alerts trigger with in-app notifications.
        </p>
      </GlassPanel>
    </aside>
  );
};

export default RightPanel;
