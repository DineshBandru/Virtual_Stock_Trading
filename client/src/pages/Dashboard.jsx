import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import CandlestickChart from "../components/charts/CandlestickChart";
import useLivePrices from "../hooks/useLivePrices";

const Dashboard = () => {
  const overviewData = [];
  const livePrices = useLivePrices();
  const symbols = Object.keys(livePrices).slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Terminal Dashboard"
        subtitle="Real-time market intelligence, AI signals, and your virtual capital overview."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Virtual Balance" value="—" accent="cyan" />
        <StatCard label="Portfolio Value" value="—" accent="amber" />
        <StatCard label="Today's P&L" value="—" accent="cyan" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <GlassPanel className="min-h-[320px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Market Overview
            </h3>
            <span className="text-xs text-slate-400">Live candlesticks</span>
          </div>
          <div className="mt-6 rounded-2xl border border-borderGlow/60 bg-base/70 p-4">
            <CandlestickChart data={overviewData} height={220} />
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[320px]">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            AI Signal Summary
          </h3>
          <div className="mt-6 space-y-4 text-sm text-slate-300">
            <p>Signals appear when 30-day price history is loaded.</p>
            <div className="rounded-xl border border-borderGlow/60 bg-base/70 p-4 text-xs text-slate-400">
              SMA/RSI logic explanation will surface here.
            </div>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Live Watch Pulse
        </h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {symbols.length === 0 ? (
            <div className="text-xs text-slate-400">
              Add symbols to your watchlist to see live prices.
            </div>
          ) : (
            symbols.map((symbol) => {
              const quote = livePrices[symbol];
              const change = quote?.pc
                ? ((quote.c - quote.pc) / quote.pc) * 100
                : 0;
              const changeClass = change >= 0 ? "text-cyan" : "text-red-400";
              return (
                <div
                  key={symbol}
                  className="rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3"
                >
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {symbol}
                  </p>
                  <p className="mt-2 font-mono text-lg text-white">
                    ₹{quote?.c?.toFixed(2) || "—"}
                  </p>
                  <p className={`text-xs ${changeClass}`}>
                    {Number.isFinite(change) ? `${change.toFixed(2)}%` : "—"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

export default Dashboard;
