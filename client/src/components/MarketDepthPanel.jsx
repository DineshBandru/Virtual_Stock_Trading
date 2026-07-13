import GlassPanel from "./GlassPanel";
import { Skeleton } from "./Skeleton";

const formatNumber = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatQty = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(value);
};

const LevelRow = ({ level, tone, maxQty, align = "left" }) => {
  const width = maxQty > 0 && Number.isFinite(level?.quantity)
    ? Math.max(6, Math.min(100, (level.quantity / maxQty) * 100))
    : 6;

  const barClass = tone === "buy" ? "bg-cyan/35" : "bg-rose-400/35";
  const textClass = tone === "buy" ? "text-cyan-200" : "text-rose-200";

  return (
    <div className={`relative overflow-hidden rounded-xl border border-borderGlow/40 bg-base/60 px-3 py-2 ${textClass}`}>
      <div
        className={`absolute inset-y-0 ${align === "right" ? "right-0" : "left-0"} ${barClass}`}
        style={{ width: `${width}%` }}
      />
      <div className="relative grid grid-cols-3 items-center gap-2 text-xs">
        <span className={`font-mono ${align === "right" ? "text-right" : "text-left"}`}>
          {formatNumber(level?.price)}
        </span>
        <span className={`font-mono ${align === "right" ? "text-right" : "text-left"}`}>
          {formatQty(level?.quantity)}
        </span>
        <span className={`font-mono ${align === "right" ? "text-right" : "text-left"}`}>
          {formatQty(level?.orders)}
        </span>
      </div>
    </div>
  );
};

const MarketDepthPanel = ({ depth, loading = false, error = "", symbol = "" }) => {
  const bids = depth?.bids || [];
  const asks = depth?.asks || [];
  const maxBuyQty = Math.max(...bids.map((level) => level.quantity || 0), 0);
  const maxSellQty = Math.max(...asks.map((level) => level.quantity || 0), 0);

  return (
    <GlassPanel className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Market Depth</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Level 2 Order Book</h3>
          <p className="mt-1 text-xs text-slate-500">{symbol ? `${symbol} depth from pending OMS orders` : "Live order book"}</p>
        </div>
        <div className="rounded-full border border-borderGlow/50 bg-base/60 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
          Real-time
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Spread", value: depth?.spread },
          { label: "Buy/Sell Ratio", value: depth?.buySellRatio },
          { label: "Total Buy Qty", value: depth?.totalBuyQty },
          { label: "Total Sell Qty", value: depth?.totalSellQty }
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-borderGlow/50 bg-panel/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
            <div className="mt-2 font-mono text-lg text-white">
              {loading ? <Skeleton className="h-5 w-20" /> : formatNumber(item.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200">Buy Side</h4>
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Price / Qty / Orders</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))
            ) : bids.length > 0 ? (
              bids.map((level) => (
                <LevelRow key={`${level.price}-${level.orders}-buy`} level={level} tone="buy" maxQty={maxBuyQty} align="left" />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-borderGlow/40 bg-base/50 px-4 py-6 text-center text-sm text-slate-500">
                No pending buy orders
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-200">Sell Side</h4>
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Price / Qty / Orders</span>
          </div>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-11 w-full rounded-xl" />
              ))
            ) : asks.length > 0 ? (
              asks.map((level) => (
                <LevelRow key={`${level.price}-${level.orders}-sell`} level={level} tone="sell" maxQty={maxSellQty} align="right" />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-borderGlow/40 bg-base/50 px-4 py-6 text-center text-sm text-slate-500">
                No pending sell orders
              </div>
            )}
          </div>
        </div>
      </div>
    </GlassPanel>
  );
};

export default MarketDepthPanel;