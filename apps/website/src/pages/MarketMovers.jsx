import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCcw, TrendingDown, TrendingUp, Volume2 } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";

const tabs = [
  { key: "gainers", label: "Top Gainers", icon: TrendingUp },
  { key: "losers", label: "Top Losers", icon: TrendingDown },
  { key: "active", label: "Most Active", icon: Volume2 }
];

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "Unavailable";

const formatPercent = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%` : "Unavailable";

const TrendValue = ({ value, formatter = formatPercent }) => {
  const numericValue = Number(value);
  const isPositive = Number.isFinite(numericValue) ? numericValue >= 0 : true;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center justify-end gap-1.5 ${isPositive ? "text-emerald-500 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {formatter(value)}
    </span>
  );
};

const MarketMovers = () => {
  const [type, setType] = useState("gainers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const loadMovers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/market/discovery", { params: { type, limit: 10 } });
      setPayload(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load market movers"));
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadMovers();
  }, [loadMovers]);

  const rows = payload?.result || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Market Movers"
          subtitle="Discover active NSE equity names from validated market data without stock recommendations."
        />
        <button
          type="button"
          onClick={loadMovers}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#121320] px-4 py-3 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <GlassPanel>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setType(tab.key)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                  type === tab.key
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-white/10 text-[#C2C4D2] hover:border-cyan/40 hover:text-cyan"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
        {payload?.universe ? (
          <p className="mt-4 text-xs leading-5 text-[#A1A1B5]">
            Source: {payload.universe}. Results are filtered to active NSE equity instruments and cached server-side.
          </p>
        ) : null}
      </GlassPanel>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <GlassPanel>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden bg-[#080910] px-4 py-3 text-[11px] uppercase text-[#A1A1B5] lg:grid lg:grid-cols-12 lg:gap-3">
            <span className="lg:col-span-3">Company</span>
            <span className="lg:col-span-2">Symbol</span>
            <span className="lg:col-span-2 text-right">Current Price</span>
            <span className="lg:col-span-2 text-right">Change</span>
            <span className="lg:col-span-1 text-right">Change %</span>
            <span className="lg:col-span-2 text-right">Volume</span>
          </div>

          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="px-4 py-4">
                <Skeleton className="h-5 w-full" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-[#A1A1B5]">
              <p className="font-semibold text-white">No reliable market mover data available.</p>
              <p className="mt-2">Trade Abhyas will not fabricate rankings when the market provider cannot return valid NSE data.</p>
            </div>
          ) : (
            rows.map((item) => (
              <Link
                key={item.symbol}
                to={`/stocks/${item.symbol}`}
                className="grid grid-cols-2 gap-3 px-4 py-4 text-sm transition hover:bg-[#080910] lg:grid-cols-12 lg:items-center"
              >
                <div className="col-span-2 lg:col-span-3">
                  <p className="font-semibold text-white">{item.companyName}</p>
                  <p className="mt-1 text-xs text-[#A1A1B5]">{payload.type === "active" ? "Volume ranked" : "Price move ranked"}</p>
                </div>
                <p className="font-mono text-cyan lg:col-span-2">{item.symbol}</p>
                <p className="text-right text-white lg:col-span-2">{formatCurrency(item.currentPrice)}</p>
                <p className="text-right lg:col-span-2">
                  <TrendValue value={item.change} formatter={formatCurrency} />
                </p>
                <p className="text-right lg:col-span-1">
                  <TrendValue value={item.changePercent} />
                </p>
                <p className="text-right font-mono text-[#C2C4D2] lg:col-span-2">
                  {Number(item.volume).toLocaleString("en-IN")}
                </p>
              </Link>
            ))
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

export default MarketMovers;
