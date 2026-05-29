import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";

const Leaderboard = () => {
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Leaderboard"
        subtitle="Ranked by total portfolio value. Updated hourly."
      />

      <GlassPanel>
        <div className="rounded-2xl border border-dashed border-borderGlow/60 p-10 text-center text-xs text-slate-400">
          Leaderboard table renders here.
        </div>
      </GlassPanel>
    </div>
  );
};

export default Leaderboard;
