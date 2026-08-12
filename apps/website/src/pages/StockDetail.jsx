import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import CandlestickChart from "../components/charts/CandlestickChart";
import MarketStatusBadge from "../components/MarketStatusBadge";
import OrderTicket from "../components/OrderTicket";
import RiskPositionCalculator from "../components/RiskPositionCalculator";
import { Skeleton } from "../components/Skeleton";
import useAuth from "../hooks/useAuth";
import useStockDetail from "../hooks/useStockDetail";
import { getNseMarketStatus } from "../utils/marketStatus";

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
    candles,
    changePct,
    loading,
    error: loadError,
    historyError,
    historyMeta,
    refresh
  } = useStockDetail(normalizedSymbol, period);

  const changeClass = changePct >= 0 ? "text-emerald-400" : "text-red-400";
  const currentPrice = Number(quote?.c);
  const previousClose = Number(quote?.pc);
  const priceChange = Number.isFinite(currentPrice) && Number.isFinite(previousClose) ? currentPrice - previousClose : Number(quote?.change);
  const marketStatus = getNseMarketStatus(quote);
  const stockName = profile?.name || normalizedSymbol || "Stock";
  const volume = Number(quote?.v ?? quote?.volume ?? quote?.regularMarketVolume);
  const stats = quote
    ? [
        { label: "Current Price", value: Number.isFinite(currentPrice) ? `INR ${currentPrice.toFixed(2)}` : "N/A" },
        { label: "Previous Close", value: Number.isFinite(previousClose) ? `INR ${previousClose.toFixed(2)}` : "N/A" },
        { label: "Day Change", value: Number.isFinite(priceChange) ? `INR ${priceChange.toFixed(2)}` : "N/A" },
        { label: "Day Change %", value: Number.isFinite(changePct) ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "N/A" },
        { label: "Volume", value: Number.isFinite(volume) ? volume.toLocaleString("en-IN") : "N/A" },
        { label: "Market Status", value: marketStatus.displayState },
        {
          label: "Last Updated",
          value: quote.fetchedAt ? new Date(quote.fetchedAt).toLocaleString() : quote.t ? new Date(quote.t * 1000).toLocaleString() : "N/A"
        }
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-borderGlow bg-panel p-5" data-tour="stock-overview">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Stock Detail</p>
            <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-white md:text-3xl">{stockName}</h1>
            <p className="mt-1 font-mono text-sm text-slate-400">{normalizedSymbol || "N/A"}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              View market data, analyse price movement, and practise virtual trading.
            </p>
          </div>
          <div className="min-w-[220px] rounded-lg border border-white/10 bg-[#161725] px-4 py-3">
            <p className="text-xs font-medium uppercase text-[#A1A1B5]">Current Price</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <span className="font-mono text-2xl font-semibold text-white">
                {loading ? <Skeleton className="h-7 w-28" /> : Number.isFinite(currentPrice) ? `INR ${currentPrice.toFixed(2)}` : "N/A"}
              </span>
              <span className={`rounded-lg border border-white/10 bg-[#080910]/70 px-3 py-1 text-xs ${changeClass}`}>
                {Number.isFinite(changePct) ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%` : "N/A"}
              </span>
            </div>
          </div>
        </div>
      </section>

      <MarketStatusBadge quote={quote} />

      {loadError ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-red-300/60 px-4 py-2 text-xs font-semibold uppercase text-red-100 transition hover:bg-red-500/20"
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
          <div key={item.label} className="rounded-lg border border-white/10 bg-[#161725] px-4 py-3">
            <p className="text-xs font-medium uppercase text-[#A1A1B5]">{item.label}</p>
            <div className="mt-2">
              {loading ? <Skeleton className="h-4 w-28" /> : <p className="font-mono text-sm text-white">{item.value}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,420px)]">
        <aside className="order-1 flex min-w-0 flex-col gap-5 xl:order-2 xl:sticky xl:top-5">
          <OrderTicket symbol={normalizedSymbol} quote={quote} loading={loading} onPlaced={refresh} />

          <details className="group rounded-lg border border-borderGlow bg-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-white marker:hidden">
              <span>Trading Tools</span>
              <span className="text-xs text-slate-500 transition group-open:rotate-180">v</span>
            </summary>
            <div className="border-t border-borderGlow p-5">
              <RiskPositionCalculator
                compact
                availableBalance={user?.balance}
                entryPrice={quote?.c}
              />
            </div>
          </details>

          <details className="group rounded-lg border border-borderGlow bg-panel">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-white marker:hidden">
              <span>Beginner Guidance</span>
              <span className="text-xs text-slate-500 transition group-open:rotate-180">v</span>
            </summary>
            <div className="border-t border-borderGlow p-5">
              <p className="text-xs font-semibold uppercase text-cyan">What next?</p>
              <h3 className="mt-2 text-base font-semibold text-white">Ready to practise on this stock?</h3>
              <p className="mt-2 text-sm leading-6 text-[#C2C4D2]">
                Review the current price and market status, choose Buy or Sell, enter shares, then Review Order before confirming.
              </p>
              <Link to="/trading-guide#worked-example" className="mt-3 inline-flex text-sm font-semibold text-cyan transition hover:text-cyan-100">
                See the worked example
              </Link>
            </div>
          </details>
        </aside>

        <div className="order-2 flex min-w-0 flex-col gap-5 xl:order-1">
          <GlassPanel className="h-fit min-w-0 p-4">
            <CandlestickChart
              data={candles}
              height={340}
              loading={loading}
              error={historyError}
              title="Price Chart"
              symbol={normalizedSymbol}
              quote={quote}
              period={period}
              historyMeta={historyMeta}
              mode={chartMode}
              onModeChange={setChartMode}
              onPeriodChange={setPeriod}
            />

            <details className="mt-4 rounded-lg border border-white/10 bg-[#080910]/70">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-semibold uppercase text-[#A1A1B5] marker:hidden">
                Advanced Chart Tools
                <span className="text-slate-500">v</span>
              </summary>
              <div className="border-t border-white/10 p-3">
                <h4 className="mb-2 text-xs font-medium uppercase text-[#A1A1B5]">Compare Stock</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter NSE Symbol..."
                    className="min-h-10 flex-1 rounded-lg border border-white/10 bg-[var(--bg-input)] px-3 text-sm text-white outline-none focus:border-cyan"
                  />
                  <button className="min-h-10 rounded-lg border border-cyan/50 bg-cyan/10 px-4 text-sm font-semibold text-cyan transition hover:bg-cyan/20">
                    Compare
                  </button>
                </div>
              </div>
            </details>
          </GlassPanel>

          <GlassPanel>
            <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">Key Stats</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {stats.map((item, index) => {
                return (
                  <div key={`stat-${index}`} className="rounded-lg border border-white/10 bg-[#080910]/70 p-4">
                    <p className="text-xs font-medium uppercase text-[#A1A1B5]">{item?.label || "Quote"}</p>
                    <p className="mt-2 font-mono text-sm text-white">{quote ? item?.value : "Loading quote..."}</p>
                  </div>
                );
              })}
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
