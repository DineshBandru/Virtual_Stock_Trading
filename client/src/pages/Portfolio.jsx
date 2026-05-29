import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";

const Portfolio = () => {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Portfolio"
        subtitle="Track holdings, performance, and sector allocation in real time."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <GlassPanel className="lg:col-span-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Holdings Table
          </h3>
          <div className="mt-6 rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
            Holdings table renders here.
          </div>
        </GlassPanel>

        <GlassPanel>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Allocation
          </h3>
          <div className="mt-6 rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
            Sector allocation chart renders here.
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Portfolio;
