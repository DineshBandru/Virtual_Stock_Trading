import GlassPanel from "./GlassPanel";

const StatCard = ({ label, value = "N/A" }) => {
  return (
    <GlassPanel className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase text-[#A1A1B5]">
        {label}
      </span>
      <span className="font-mono text-2xl font-semibold text-white">{value}</span>
    </GlassPanel>
  );
};

export default StatCard;
