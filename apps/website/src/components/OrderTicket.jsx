import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "./GlassPanel";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import useAuth from "../hooks/useAuth";
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
  const { user, updateUser, refresh: refreshUser } = useAuth();
  const [side, setSide] = useState("BUY");
  const [orderType, setOrderType] = useState("MARKET");
  const [quantity, setQuantity] = useState("");
  const [triggerPrice, setTriggerPrice] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const lastPrice = Number(quote?.c);
  const hasValidPrice = Number.isFinite(lastPrice) && lastPrice > 0;
  const availableCash = Number(user?.balance);
  const needsTrigger = orderType === "STOP_LOSS" || orderType === "STOP_LIMIT";
  const needsLimit = orderType === "LIMIT" || orderType === "STOP_LIMIT";
  const estimatedPrice = needsLimit && Number.isFinite(Number(limitPrice)) && Number(limitPrice) > 0
    ? Number(limitPrice)
    : hasValidPrice
      ? lastPrice
      : null;
  const estimatedNotional = useMemo(() => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || !Number.isFinite(estimatedPrice)) {
      return 0;
    }
    return qty * estimatedPrice;
  }, [quantity, estimatedPrice]);

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
    if (!String(symbol).toUpperCase().endsWith(".NS")) {
      setError("Select a valid NSE symbol before placing an order");
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive whole number");
      return;
    }
    if (!hasValidPrice) {
      setError("Market price is unavailable. Try again after the quote loads.");
      return;
    }
    if (side === "BUY" && Number.isFinite(availableCash) && estimatedNotional > availableCash) {
      setError("Insufficient virtual funds for this buy order");
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
    if (orderType === "STOP_LIMIT" && side === "BUY" && Number(limitPrice) < Number(triggerPrice)) {
      setError("Buy stop-limit price must be greater than or equal to trigger price");
      return;
    }
    if (orderType === "STOP_LIMIT" && side === "SELL" && Number(limitPrice) > Number(triggerPrice)) {
      setError("Sell stop-limit price must be less than or equal to trigger price");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setResult(null);
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
      const executionPrice = Number(placedOrder?.executionPrice ?? execution?.order?.executionPrice);
      const totalAmount = Number.isFinite(executionPrice) ? executionPrice * parsedQuantity : estimatedNotional;

      if (placedOrder?.status === "Rejected") {
        const reason = placedOrder.rejectionReason || "Order was rejected";
        setError(reason);
        setResult({ status: "Rejected", message: reason, order: placedOrder });
        push(reason, "error");
        return;
      }

      if (placedOrder?.status === "Executed") {
        const nextBalance = Number(execution?.balance);
        if (Number.isFinite(nextBalance)) {
          updateUser({ balance: nextBalance });
        }
        refreshUser?.();
        setResult({
          status: "Executed",
          symbol: placedOrder.symbol,
          quantity: parsedQuantity,
          executionPrice,
          totalAmount,
          balance: nextBalance
        });
        push(`Order placed successfully: ${placedOrder.symbol} x ${parsedQuantity}`, "success");
      } else {
        setResult({ status: placedOrder?.status || "Pending", order: placedOrder });
        push("Order queued for execution", "info");
      }

      setQuantity("");
      setTriggerPrice("");
      setLimitPrice("");
      setOrderType("MARKET");
      setSide("BUY");
      onPlaced?.(response.data);
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to place order");
      setError(message);
      push(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GlassPanel className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-[#A1A1B5]">Order Ticket</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Place and manage orders</h3>
        </div>
        <Link
          to="/orders"
          className="rounded-2xl border border-white/10 px-3 py-1 text-xs text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
        >
          Order History
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#080910]/70 p-4">
        <p className="text-xs font-medium uppercase text-[#A1A1B5]">Symbol</p>
        <p className="mt-2 text-2xl font-semibold text-white">{symbol || "N/A"}</p>
        <p className="mt-2 text-xs text-[#A1A1B5]">
          Last traded price: <span className="text-white">{loading ? "Loading..." : hasValidPrice ? formatCurrency(lastPrice) : "Unavailable"}</span>
        </p>
        <p className="mt-1 text-xs text-[#A1A1B5]">
          Available virtual cash: <span className="text-white">{formatCurrency(availableCash)}</span>
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "BUY", label: "Buy", tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
            { value: "SELL", label: "Sell", tone: "text-red-300 border-red-500/30 bg-red-500/10" }
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setSide(item.value)}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                side === item.value
                  ? item.tone
                  : "border-white/10 bg-[#080910]/60 text-[#C2C4D2] hover:border-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          Order Type
          <select
            value={orderType}
            onChange={(event) => {
              const nextType = event.target.value;
              setOrderType(nextType);
              resetPriceFields(nextType);
            }}
            className="rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
          >
            {orderTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          Quantity
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
            placeholder="Enter shares"
          />
        </label>

        {needsTrigger ? (
          <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
            Trigger Price
            <input
              type="number"
              min="0"
              step="0.05"
              value={triggerPrice}
              onChange={(event) => setTriggerPrice(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
              placeholder="Price that activates the stop order"
            />
          </label>
        ) : null}

        {needsLimit ? (
          <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
            Limit Price
            <input
              type="number"
              min="0"
              step="0.05"
              value={limitPrice}
              onChange={(event) => setLimitPrice(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
              placeholder="Execution limit"
            />
          </label>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-[#080910]/70 px-4 py-4 text-sm text-[#C2C4D2]">
          <div className="flex items-center justify-between gap-3">
            <span>Estimated Order Value</span>
            <span className="font-mono text-white">{formatCurrency(estimatedNotional)}</span>
          </div>
          <p className="mt-2 text-xs text-[#6F7487]">
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
            disabled={submitting || loading || !hasValidPrice}
            className="flex-1 rounded-2xl border border-cyan/60 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Place Order"}
          </button>
          <Link
            to="/orders"
            className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
          >
            Track Orders
          </Link>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        {result?.status === "Executed" ? (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
            <p className="font-semibold">Order placed successfully</p>
            <div className="mt-3 space-y-1 text-xs">
              <p>Symbol: {result.symbol}</p>
              <p>Quantity: {result.quantity}</p>
              <p>Execution price: {formatCurrency(result.executionPrice)}</p>
              <p>Total amount: {formatCurrency(result.totalAmount)}</p>
              <p>Remaining virtual cash: {formatCurrency(result.balance)}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to="/portfolio" className="rounded-xl border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20">
                Portfolio
              </Link>
              <Link to="/orders" className="rounded-xl border border-emerald-300/40 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20">
                Orders
              </Link>
            </div>
          </div>
        ) : result?.status === "Rejected" ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-100">
            <p className="font-semibold">Order rejected</p>
            <p className="mt-2 text-xs">{result.message}</p>
          </div>
        ) : null}
      </form>
    </GlassPanel>
  );
};

export default OrderTicket;
