import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "./GlassPanel";
import api from "../utils/api";
import useToast from "../hooks/useToast";

const orderTypes = [
  { value: "MARKET", label: "Market" },
  { value: "LIMIT", label: "Limit" },
  { value: "STOP_LOSS", label: "Stop Loss" },
  { value: "STOP_LIMIT", label: "Stop Limit" }
];

const formatCurrency = (value) =>
  Number.isFinite(value)
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value)
    : "—";

const OrderTicket = ({ symbol, quote, loading, onPlaced }) => {
  const { push } = useToast();
  const [side, setSide] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const lastPrice = Number(quote?.c || 0);
  const needsTrigger = orderType === "STOP_LOSS" || orderType === "STOP_LIMIT";
  const needsLimit = orderType === "LIMIT" || orderType === "STOP_LIMIT";
  const estimatedNotional = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(lastPrice)) {
      return 0;
    }
    return qty * lastPrice;
  }, [quantity, lastPrice]);

  const resetPriceFields = (nextOrderType) => {
    const nextNeedsTrigger = nextOrderType === "STOP_LOSS" || nextOrderType === "STOP_LIMIT";
    const nextNeedsLimit = nextOrderType === "LIMIT" || nextOrderType === "STOP_LIMIT";
    if (!nextNeedsTrigger) {
      setTriggerPrice("");
    }
    if (!nextNeedsLimit) {
      setLimitPrice("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!symbol) {
      setError("Symbol is required");
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    if (needsTrigger && (!Number.isFinite(Number(triggerPrice)) || Number(triggerPrice) <= 0)) {
      setError("Trigger price is required for stop orders");
      return;
    }
    if (needsLimit && (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0)) {
      setError("Limit price is required for limit orders");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await api.post("/api/orders", {
        symbol: symbol.toUpperCase(),
        quantity: parsedQuantity,
        side,
        orderType,
        triggerPrice: needsTrigger ? Number(triggerPrice) : undefined,
        limitPrice: needsLimit ? Number(limitPrice) : undefined
      });

      const placedOrder = response.data?.order;
      const execution = response.data?.execution;
      if (placedOrder?.status === "Executed" && execution?.order) {
        push(`Order executed at ${formatCurrency(execution.order.executionPrice)}`, "success");
      } else if (placedOrder?.status === "Executed") {
        push("Order executed", "success");
      } else {
        push("Order queued for execution", "info");
      }

      setQuantity("");
      setTriggerPrice("");
      setLimitPrice("");
      setOrderType("MARKET");
      setSide("BUY");
      onPlaced?.(response.data);
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to place order";
      setError(message);
      push(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassPanel className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Order Ticket</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Place and manage orders</h3>
        </div>
        <Link
          to="/orders"
          className="rounded-full border border-borderGlow/60 px-3 py-1 text-xs text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
        >
          Order History
        </Link>
      </div>

      <div className="rounded-2xl border border-borderGlow/60 bg-base/70 p-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Symbol</p>
        <p className="mt-2 text-2xl font-semibold text-white">{symbol || "—"}</p>
        <p className="mt-2 text-xs text-slate-400">
          Last traded price: <span className="text-white">{loading ? "Loading..." : formatCurrency(lastPrice)}</span>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "BUY", label: "Buy", tone: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10" },
            { value: "SELL", label: "Sell", tone: "text-red-300 border-red-400/40 bg-red-400/10" }
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSide(item.value)}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                side === item.value
                  ? item.tone
                  : "border-borderGlow/60 bg-base/60 text-slate-300 hover:border-borderGlow/80"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Order Type
          <select
            value={orderType}
            onChange={(event) => {
              const nextType = event.target.value;
              setOrderType(nextType);
              resetPriceFields(nextType);
            }}
            className="rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
          >
            {orderTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
          Quantity
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            placeholder="Enter shares"
          />
        </label>

        {needsTrigger ? (
          <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Trigger Price
            <input
              type="number"
              min="0"
              step="0.05"
              value={triggerPrice}
              onChange={(event) => setTriggerPrice(event.target.value)}
              className="rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              placeholder="Price that activates the stop order"
            />
          </label>
        ) : null}

        {needsLimit ? (
          <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Limit Price
            <input
              type="number"
              min="0"
              step="0.05"
              value={limitPrice}
              onChange={(event) => setLimitPrice(event.target.value)}
              className="rounded-xl border border-borderGlow/70 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
              placeholder="Execution limit"
            />
          </label>
        ) : null}

        <div className="rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-4 text-sm text-slate-300">
          <div className="flex items-center justify-between gap-3">
            <span>Estimated Notional</span>
            <span className="font-mono text-white">{formatCurrency(estimatedNotional)}</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {orderType === "MARKET"
              ? "Market orders execute at the current quote if sufficient balance or holdings are available."
              : orderType === "LIMIT"
                ? "Limit orders sit pending until the market reaches your price."
                : orderType === "STOP_LOSS"
                  ? "Stop loss orders become active when the trigger price is reached."
                  : "Stop limit orders activate on the trigger, then wait for the limit price."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={submitting || loading}
            className="flex-1 rounded-xl border border-cyan-400/80 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Place Order"}
          </button>
          <Link
            to="/orders"
            className="flex-1 rounded-xl border border-borderGlow/60 px-4 py-3 text-center text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
          >
            Track Orders
          </Link>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </GlassPanel>
  );
};

export default OrderTicket;