import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

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
          <Tooltip contentStyle={{ background: "#0F111A", borderColor: "#1C2333" }} />
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
