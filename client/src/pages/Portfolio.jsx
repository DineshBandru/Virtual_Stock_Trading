import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";

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
          <div className="mt-6 space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </GlassPanel>

        <GlassPanel>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Allocation
          </h3>
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Portfolio;
