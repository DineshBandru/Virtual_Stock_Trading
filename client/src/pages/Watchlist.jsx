import { useCallback, useEffect, useState } from "react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import api from "../utils/api";
import useLivePrices from "../hooks/useLivePrices";
import { Skeleton } from "../components/Skeleton";

const Watchlist = () => {
  const livePrices = useLivePrices();
  const [symbols, setSymbols] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/watchlist");
      setSymbols(response.data.symbols || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load watchlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Watchlist"
        subtitle="Track symbols with live updates every 15 seconds."
      />

      <GlassPanel>
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-red-300/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-100 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3"
              >
                <Skeleton className="h-3 w-1/3" />
                <div className="mt-3">
                  <Skeleton className="h-5 w-1/2" />
                </div>
                <div className="mt-2">
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : symbols.length === 0 ? (
            <div className="text-xs text-slate-400">
              Add symbols to begin tracking live updates.
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

export default Watchlist;
