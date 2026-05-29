import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import PnlAreaChart from "../components/charts/PnlAreaChart";
import SectorPieChart from "../components/charts/SectorPieChart";

const Analytics = () => {
  const pnlData = [];
  const sectorData = [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Advanced Analytics"
        subtitle="Performance insights, win rate, exposure, and hold duration."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              P&L Trend
            </h3>
            <span className="text-xs text-slate-400">All time</span>
          </div>
          <div className="mt-6">
            <PnlAreaChart data={pnlData} />
          </div>
        </GlassPanel>
        <GlassPanel>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Sector Exposure
            </h3>
            <span className="text-xs text-slate-400">Allocation</span>
          </div>
          <div className="mt-6">
            <SectorPieChart data={sectorData} />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Analytics;
