import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import CandlestickChart from "../components/charts/CandlestickChart";
import MarketDepthPanel from "../components/MarketDepthPanel";
import OrderTicket from "../components/OrderTicket";
import { Skeleton } from "../components/Skeleton";
import useStockDetail from "../hooks/useStockDetail";

const StockDetail = () => {
  const { symbol } = useParams();
  const [period, setPeriod] = useState("1M");
  const [chartMode, setChartMode] = useState("candles");

  const {
    quote,
    profile,
    signal,
    candles,
    marketDepth,
    depthLoading,
    depthError,
    changePct,
    loading,
    error: loadError,
    refresh
  } = useStockDetail(symbol, period);

  const changeClass = changePct >= 0 ? "text-cyan" : "text-red-400";
  const stats = quote
    ? [
        `Open: ₹${quote.o?.toFixed(2) || "—"}`,
        `High: ₹${quote.h?.toFixed(2) || "—"}`,
        `Low: ₹${quote.l?.toFixed(2) || "—"}`,
        `Volume: ${quote.v?.toLocaleString() || "—"}`
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Stock Detail"
          subtitle="Candlestick view, AI signals, and order execution in one terminal panel."
        />
        <div className="flex items-center gap-4 rounded-2xl border border-borderGlow/60 bg-panel/70 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Live Quote</span>
            <span className="font-mono text-xl text-white">
              {loading ? <Skeleton className="h-6 w-24" /> : quote?.c ? `₹${quote.c.toFixed(2)}` : "—"}
            </span>
          </div>
          <span className={`rounded-full border border-borderGlow/60 px-3 py-1 text-xs ${changeClass}`}>
            {Number.isFinite(changePct) ? `${changePct.toFixed(2)}%` : "—"}
          </span>
        </div>
      </div>

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border border-red-300/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-100 transition hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Company", value: profile?.name || "—" },
          { label: "Sector", value: profile?.finnhubIndustry || "—" },
          {
            label: "Market Cap",
            value: profile?.marketCapitalization ? `₹${profile.marketCapitalization.toFixed(2)}B` : "—"
          },
          { label: "P/E Ratio", value: profile?.peRatio || "—" }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-borderGlow/60 bg-panel/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
            <div className="mt-2">
              {loading ? <Skeleton className="h-4 w-28" /> : <p className="font-mono text-sm text-white">{item.value}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <GlassPanel className="min-h-[360px]">
          <CandlestickChart
            data={candles}
            height={360}
            loading={loading}
            error={loadError}
            title="TradingView-Style Chart"
            symbol={symbol?.toUpperCase()}
            quote={quote}
            period={period}
            mode={chartMode}
            onModeChange={setChartMode}
            onPeriodChange={setPeriod}
          />

          <div className="mt-6">
            <h4 className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-400">Compare Symbol</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter NSE Symbol..."
                className="flex-1 rounded-xl border border-borderGlow/50 bg-panel/50 px-4 py-2 text-sm text-white outline-none"
              />
              <button className="rounded-xl border border-cyan/50 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/20">
                Compare
              </button>
            </div>
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-6">
          <OrderTicket symbol={symbol?.toUpperCase()} quote={quote} loading={loading} onPlaced={refresh} />

          <GlassPanel>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              AI Signal
            </h3>
            <p className="mt-4 text-sm text-slate-300">
              {signal ? `${signal.signal} • ${signal.confidence}% confidence` : "Signal will appear once history is loaded."}
            </p>
            {signal ? <p className="mt-2 text-xs text-slate-400">{signal.explanation}</p> : null}
            <Link
              to="/orders"
              className="mt-4 inline-flex rounded-xl border border-borderGlow/60 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
            >
              View Orders
            </Link>
          </GlassPanel>
        </div>
      </div>

      <MarketDepthPanel
        symbol={symbol?.toUpperCase()}
        depth={marketDepth}
        loading={depthLoading}
        error={depthError}
      />

      <GlassPanel>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Key Stats</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`stat-${index}`} className="rounded-xl border border-borderGlow/60 bg-base/70 p-4 text-xs text-slate-400">
              {quote ? stats[index] : "Loading quote..."}
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};

export default StockDetail;
