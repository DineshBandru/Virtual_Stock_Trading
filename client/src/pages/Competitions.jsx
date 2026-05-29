import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";

const Competitions = () => {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Trading Competitions"
        subtitle="Join competitions and climb the leaderboard with separate balances."
      />

      <GlassPanel>
        <div className="rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
          Competition cards render here.
        </div>
      </GlassPanel>
    </div>
  );
};

export default Competitions;
