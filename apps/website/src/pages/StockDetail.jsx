import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import CandlestickChart from "../components/charts/CandlestickChart";
import MarketDepthPanel from "../components/MarketDepthPanel";
import MarketStatusBadge from "../components/MarketStatusBadge";
import OrderTicket from "../components/OrderTicket";
import RiskPositionCalculator from "../components/RiskPositionCalculator";
import { Skeleton } from "../components/Skeleton";
import useAuth from "../hooks/useAuth";
import useStockDetail from "../hooks/useStockDetail";

const StockDetail = () => {
  const { symbol } = useParams();
  const { user } = useAuth();
  const normalizedSymbol = useMemo(() => {
    const value = String(symbol || "").trim().toUpperCase();
    if (!value) return "";
    return value.endsWith(".NS") ? value : `${value}.NS`;
  }, [symbol]);
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
    historyError,
    historyMeta,
    refresh
  } = useStockDetail(normalizedSymbol, period);

  const changeClass = changePct >= 0 ? "text-emerald-400" : "text-red-400";
  const stats = quote
    ? [
        { label: "Symbol", value: normalizedSymbol || "N/A" },
        { label: "Previous Close", value: Number.isFinite(quote.pc) ? `INR ${quote.pc.toFixed(2)}` : "N/A" },
        { label: "Price Change", value: Number.isFinite(quote.change) ? `INR ${quote.change.toFixed(2)}` : "N/A" },
        { label: "Market Status", value: quote.marketState || "N/A" },
        {
          label: "Quote Updated",
          value: quote.fetchedAt ? new Date(quote.fetchedAt).toLocaleString() : quote.t ? new Date(quote.t * 1000).toLocaleString() : "N/A"
        },
        { label: "Data State", value: quote.stale ? "Stale cached" : quote.cached ? "Cached" : "Fresh" }
      ]
    : [];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4" data-tour="stock-overview">
        <PageHeader
          title="Stock Detail"
          subtitle="Candlestick view, AI signals, and order execution in one terminal panel."
        />
        <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#161725] px-4 py-3">
          <div className="flex flex-col">
            <span className="text-xs font-medium uppercase text-[#A1A1B5]">Live Quote</span>
            <span className="font-mono text-xl text-white">
              {loading ? <Skeleton className="h-6 w-24" /> : Number.isFinite(quote?.c) ? `INR ${quote.c.toFixed(2)}` : "N/A"}
            </span>
          </div>
          <span className={`rounded-2xl border border-white/10 bg-[#080910]/70 px-3 py-1 text-xs ${changeClass}`}>
            {Number.isFinite(changePct) ? `${changePct.toFixed(2)}%` : "N/A"}
          </span>
        </div>
      </div>

      <MarketStatusBadge quote={quote} />

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-2xl border border-red-300/60 px-4 py-2 text-xs font-semibold uppercase text-red-100 transition hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Company", value: profile?.name || "N/A" },
          { label: "Sector", value: profile?.finnhubIndustry || "N/A" },
          {
            label: "Market Cap",
            value: profile?.marketCapitalization ? `INR ${profile.marketCapitalization.toFixed(2)}B` : "N/A"
          },
          { label: "P/E Ratio", value: profile?.peRatio || "N/A" }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-[#161725] px-4 py-3">
            <p className="text-xs font-medium uppercase text-[#A1A1B5]">{item.label}</p>
            <div className="mt-2">
              {loading ? <Skeleton className="h-4 w-28" /> : <p className="font-mono text-sm text-white">{item.value}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 gap-6 xl:grid-cols-[2fr_1fr]">
        <GlassPanel className="min-h-[360px] min-w-0">
          <CandlestickChart
            data={candles}
            height={360}
            loading={loading}
            error={historyError}
            title="TradingView-Style Chart"
            symbol={normalizedSymbol}
            quote={quote}
            period={period}
            historyMeta={historyMeta}
            mode={chartMode}
            onModeChange={setChartMode}
            onPeriodChange={setPeriod}
          />

          <div className="mt-6">
            <h4 className="mb-2 text-xs font-medium uppercase text-[#A1A1B5]">Compare Symbol</h4>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter NSE Symbol..."
                className="flex-1 rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-2 text-sm text-white outline-none focus:border-cyan"
              />
              <button className="rounded-2xl border border-cyan/50 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/20">
                Compare
              </button>
            </div>
          </div>
        </GlassPanel>

        <div className="flex min-w-0 flex-col gap-6">
          <GlassPanel className="border-cyan/20 bg-cyan/5">
            <p className="text-xs font-semibold uppercase text-cyan">What next?</p>
            <h3 className="mt-2 text-base font-semibold text-white">Ready to practise on this stock?</h3>
            <p className="mt-2 text-sm leading-6 text-[#C2C4D2]">
              Review the current price, chart, and market status first. Then use the order ticket below with a small virtual quantity and Review Order before confirming.
            </p>
            <Link to="/trading-guide#worked-example" className="mt-3 inline-flex text-sm font-semibold text-cyan transition hover:text-cyan-100">
              See the worked example
            </Link>
          </GlassPanel>

          <OrderTicket symbol={normalizedSymbol} quote={quote} loading={loading} onPlaced={refresh} />

          <RiskPositionCalculator
            compact
            availableBalance={user?.balance}
            entryPrice={quote?.c}
          />

          <GlassPanel>
            <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">
              AI Signal
            </h3>
            <p className="mt-4 text-sm text-[#C2C4D2]">
              {signal ? `${signal.signal} - ${signal.confidence}% confidence` : "Signal will appear once history is loaded."}
            </p>
            {signal ? <p className="mt-2 text-xs text-[#A1A1B5]">{signal.explanation}</p> : null}
            <Link
              to="/orders"
              className="mt-4 inline-flex rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
            >
              View Orders
            </Link>
          </GlassPanel>
        </div>
      </div>

      <MarketDepthPanel
        symbol={normalizedSymbol}
        depth={marketDepth}
        loading={depthLoading}
        error={depthError}
      />

      <GlassPanel>
        <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">Key Stats</h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => {
            return (
            <div key={`stat-${index}`} className="rounded-2xl border border-white/10 bg-[#080910]/70 p-4">
              <p className="text-xs font-medium uppercase text-[#A1A1B5]">{item?.label || "Quote"}</p>
              <p className="mt-2 font-mono text-sm text-white">{quote ? item?.value : "Loading quote..."}</p>
            </div>
            );
          })}
        </div>
      </GlassPanel>
    </div>
  );
};

export default StockDetail;
