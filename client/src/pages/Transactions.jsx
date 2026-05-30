import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";

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
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Transactions;
