import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import CandlestickChart from "../components/charts/CandlestickChart";
import ConfirmModal from "../components/ConfirmModal";
import useStockDetail from "../hooks/useStockDetail";
import api from "../utils/api";
import useToast from "../hooks/useToast";

const periods = ["1D", "1W", "1M", "3M", "1Y"];

const StockDetail = () => {
  const { symbol } = useParams();
  const [period, setPeriod] = useState("1M");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const { push } = useToast();

  const { quote, profile, signal, candles, changePct, loading } = useStockDetail(
    symbol,
    period
  );

  const estimatedTotal = useMemo(() => {
    if (!quote || !quantity) return 0;
    return Number(quantity) * quote.c;
  }, [quote, quantity]);

  const changeClass = changePct >= 0 ? "text-cyan" : "text-red-400";

  const handleTrade = async () => {
    if (!quantity || Number(quantity) <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setError("");
    setPending(true);
    try {
      const endpoint = side === "BUY" ? "/api/trade/buy" : "/api/trade/sell";
      await api.post(endpoint, {
        symbol: symbol?.toUpperCase(),
        quantity: Number(quantity)
      });
      push(`${side} executed`, "success");
      setQuantity("");
      setModalOpen(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Trade failed");
      push("Trade failed", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Stock Detail"
          subtitle="Candlestick view, AI signals, and trade execution in one terminal panel."
        />
        <div className="flex items-center gap-4 rounded-2xl border border-borderGlow/60 bg-panel/70 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Live Quote
            </span>
            <span className="font-mono text-xl text-white">
              {quote?.c ? `₹${quote.c.toFixed(2)}` : "—"}
            </span>
          </div>
          <span
            className={`rounded-full border border-borderGlow/60 px-3 py-1 text-xs ${changeClass}`}
          >
            {Number.isFinite(changePct) ? `${changePct.toFixed(2)}%` : "—"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Company", value: profile?.name || "—" },
          { label: "Sector", value: profile?.finnhubIndustry || "—" },
          {
            label: "Market Cap",
            value: profile?.marketCapitalization
              ? `₹${profile.marketCapitalization.toFixed(2)}B`
              : "—"
          },
          { label: "P/E Ratio", value: profile?.peRatio || "—" }
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-borderGlow/60 bg-panel/70 px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 font-mono text-sm text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <GlassPanel className="min-h-[360px]">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Candlestick Chart
            </h3>
            <div className="flex gap-2 text-xs text-slate-400">
              {periods.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPeriod(item)}
                  className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] transition ${
                    period === item
                      ? "border-cyan/70 text-cyan"
                      : "border-borderGlow/60 text-slate-400"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-borderGlow/60 bg-base/70 p-4">
            <CandlestickChart data={candles} height={260} />
          </div>
        </GlassPanel>

        <div className="flex flex-col gap-6">
          <GlassPanel>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              Buy / Sell
            </h3>
            <div className="mt-6 flex gap-2 rounded-xl border border-borderGlow/60 bg-base/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSide("BUY")}
                className={`flex-1 rounded-lg border px-3 py-2 font-semibold transition ${
                  side === "BUY"
                    ? "border-cyan/60 bg-cyan/10 text-cyan shadow-glow"
                    : "border-borderGlow/60 text-slate-300"
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setSide("SELL")}
                className={`flex-1 rounded-lg border px-3 py-2 font-semibold transition ${
                  side === "SELL"
                    ? "border-amber/60 bg-amber/10 text-amber shadow-glowAmber"
                    : "border-borderGlow/60 text-slate-300"
                }`}
              >
                Sell
              </button>
            </div>
            <div className="mt-4 space-y-4 text-xs text-slate-400">
              <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Quantity
                <input
                  type="number"
                  min="0"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white focus:border-cyan focus:outline-none"
                  placeholder="Enter shares"
                />
              </label>
              <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Estimated Cost
                <input
                  type="text"
                  disabled
                  className="rounded-xl border border-borderGlow/60 bg-base/60 px-4 py-3 text-sm text-slate-300"
                  placeholder={quote ? `₹${estimatedTotal.toFixed(2)}` : "—"}
                />
              </label>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                disabled={loading || pending}
                className="w-full rounded-xl border border-cyan/80 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan shadow-glow transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Processing..." : "Review Trade"}
              </button>
              {error ? (
                <p className="text-[11px] text-red-400">{error}</p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Validates balance, quantity, and owned shares before submit.
                </p>
              )}
            </div>
          </GlassPanel>

          <GlassPanel>
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
              AI Signal
            </h3>
            <p className="mt-4 text-sm text-slate-300">
              {signal
                ? `${signal.signal} • ${signal.confidence}% confidence`
                : "Signal will appear once history is loaded."}
            </p>
            {signal ? (
              <p className="mt-2 text-xs text-slate-400">{signal.explanation}</p>
            ) : null}
          </GlassPanel>
        </div>
      </div>

      <GlassPanel>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Key Stats
        </h3>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`stat-${index}`}
              className="rounded-xl border border-borderGlow/60 bg-base/70 p-4 text-xs text-slate-400"
            >
              {quote
                ? [
                    `Open: ₹${quote.o.toFixed(2)}`,
                    `High: ₹${quote.h.toFixed(2)}`,
                    `Low: ₹${quote.l.toFixed(2)}`,
                    `Volume: ${quote.v?.toLocaleString() || "—"}`
                  ][index]
                : "Loading quote..."}
            </div>
          ))}
        </div>
      </GlassPanel>
      <ConfirmModal
        open={modalOpen}
        title={`${side} ${symbol?.toUpperCase() || ""}`}
        description={`Confirm ${side.toLowerCase()} for ${quantity || 0} shares at ₹${
          quote?.c ? quote.c.toFixed(2) : "—"
        }.`}
        confirmLabel={side === "BUY" ? "Execute Buy" : "Execute Sell"}
        onCancel={() => setModalOpen(false)}
        onConfirm={handleTrade}
      />
    </div>
  );
};

export default StockDetail;
