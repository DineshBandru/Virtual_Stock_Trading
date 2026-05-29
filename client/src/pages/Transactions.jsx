import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";

const Transactions = () => {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Transaction History"
        subtitle="Filter trades by date, symbol, and action. Export CSV on demand."
      />

      <GlassPanel>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-borderGlow/60 px-3 py-1 text-xs text-slate-400">
              Date range filter
            </span>
            <span className="rounded-full border border-borderGlow/60 px-3 py-1 text-xs text-slate-400">
              Symbol filter
            </span>
            <span className="rounded-full border border-borderGlow/60 px-3 py-1 text-xs text-slate-400">
              Type filter
            </span>
          </div>
          <div className="rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
            Transaction table renders here.
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Transactions;
