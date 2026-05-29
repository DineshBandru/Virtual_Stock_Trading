import { useEffect, useState } from "react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import api from "../utils/api";
import useLivePrices from "../hooks/useLivePrices";

const Watchlist = () => {
  const livePrices = useLivePrices();
  const [symbols, setSymbols] = useState([]);

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/api/watchlist");
      setSymbols(response.data.symbols || []);
    };
    load();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Watchlist"
        subtitle="Track symbols with live updates every 15 seconds."
      />

      <GlassPanel>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {symbols.length === 0 ? (
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
