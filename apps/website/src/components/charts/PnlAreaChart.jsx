import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

const tooltipContentStyle = {
  background: "#ffffff",
  border: "1px solid rgba(15, 23, 42, 0.14)",
  borderRadius: 8,
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.14)",
  color: "#0f172a"
};
const tooltipLabelStyle = { color: "#334155", fontWeight: 700 };
const tooltipItemStyle = { color: "#0f172a", fontWeight: 600 };

const PnlAreaChart = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-dashed border-borderGlow/60 text-xs text-slate-400">
        No analytics data yet
      </div>
    );
  }

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="pnlGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00F5FF" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#00F5FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" stroke="#64748B" tickLine={false} />
          <YAxis stroke="#64748B" tickLine={false} />
          <Tooltip
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#00F5FF"
            strokeWidth={2}
            fill="url(#pnlGlow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PnlAreaChart;
