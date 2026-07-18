import GlassPanel from "./GlassPanel";

const StatCard = ({ label, value = "—", accent = "cyan" }) => {
  const glowClass = accent === "amber" ? "shadow-glowAmber" : "shadow-glow";
  return (
    <GlassPanel className={`flex flex-col gap-2 ${glowClass}`}>
      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </span>
      <span className="font-mono text-2xl text-white">{value}</span>
    </GlassPanel>
  );
};

export default StatCard;
