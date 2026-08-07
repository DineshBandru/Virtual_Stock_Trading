import GlassPanel from "./GlassPanel";

const RightPanel = () => {
  return (
    <aside className="hidden h-full flex-col gap-6 border-l border-white/10 bg-[#0D0E18]/90 px-6 py-10 xl:flex">
      <GlassPanel className="space-y-3">
        <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">
          Watchlist
        </h3>
        <p className="text-xs text-[#A1A1B5]">
          Live watchlist will appear once you add symbols.
        </p>
      </GlassPanel>

      <GlassPanel className="space-y-3">
        <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">
          Market News
        </h3>
        <p className="text-xs text-[#A1A1B5]">
          News feed connects to Yahoo Finance / News API.
        </p>
      </GlassPanel>

      <GlassPanel className="mt-auto space-y-3">
        <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">
          Alerts
        </h3>
        <p className="text-xs text-[#A1A1B5]">
          Price alerts trigger with in-app notifications.
        </p>
      </GlassPanel>
    </aside>
  );
};

export default RightPanel;
