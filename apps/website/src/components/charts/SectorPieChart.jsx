import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const palette = ["#00F5FF", "#FFB800", "#7CFF6B", "#FF4D4D", "#8AA4FF"];
const tooltipContentStyle = {
  background: "#ffffff",
  border: "1px solid rgba(15, 23, 42, 0.14)",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.14)",
  color: "#0f172a"
};
const tooltipLabelStyle = { color: "#334155", fontWeight: 700 };
const tooltipItemStyle = { color: "#0f172a", fontWeight: 600 };

const SectorPieChart = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-borderGlow/60 text-xs text-slate-400">
        No sector data yet
      </div>
    );
  }

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius={60} outerRadius={90}>
            {data.map((entry, index) => (
              <Cell key={`cell-${entry.label}`} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SectorPieChart;
