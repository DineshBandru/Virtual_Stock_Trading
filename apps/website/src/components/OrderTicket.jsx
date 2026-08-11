import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "./GlassPanel";
import HelpTooltip from "./HelpTooltip";
import MarketStatusBadge from "./MarketStatusBadge";
import { getRejectionGuidance, orderStatusGuidance } from "../data/beginnerGuidance";
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
    : "Unavailable";

const getOrderTypeLabel = (value) => orderTypes.find((item) => item.value === value)?.label || value;

const orderTypeHelperText = {
  MARKET: "Market is the simplest practice order. It uses the current quote when execution is allowed.",
  LIMIT: "Limit waits for your chosen price or better. It may stay Pending if the price is not reached.",
  STOP_LOSS: "Stop-Loss waits for a trigger price before trying to exit a holding.",
  STOP_LIMIT: "Stop-Limit waits for a trigger, then behaves like a Limit order with your price control."
};

const OrderReviewModal = ({ open, review, submitting, onBack, onConfirm }) => {
  const confirmRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    confirmRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onBack();
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll("button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])") || []
        );
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onBack]);

  if (!open || !review) return null;

  const rows = [
    ["Stock", review.symbol],
    ["Action", `${review.side} ${review.quantity} ${review.quantity === 1 ? "share" : "shares"}`],
    ["Order Type", getOrderTypeLabel(review.orderType)],
    ["Current / Reference Price", formatCurrency(review.referencePrice)],
    ...(review.limitPrice ? [["Limit Price", formatCurrency(review.limitPrice)]] : []),
    ...(review.triggerPrice ? [["Trigger Price", formatCurrency(review.triggerPrice)]] : []),
    ["Approx. Order Value", formatCurrency(review.estimatedNotional)],
    ["Virtual Balance Impact", review.side === "BUY" ? `Uses about ${formatCurrency(review.estimatedNotional)}` : "Sells from your virtual holding"]
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="order-review-title" className="w-full max-w-xl">
        <GlassPanel className="max-h-[90vh] overflow-y-auto">
          <p className="text-xs font-semibold uppercase text-cyan">Review Order</p>
          <h3 id="order-review-title" className="mt-2 text-2xl font-semibold text-white">{review.symbol}</h3>
          <p className="mt-2 text-sm leading-6 text-[#C2C4D2]">
            {review.side === "BUY" ? "This trade uses virtual money only." : "This will sell shares from your virtual holding."}
          </p>

          <div className="mt-5 grid gap-3">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 rounded-lg border border-white/10 bg-[#080910] px-4 py-3 sm:grid-cols-[180px_minmax(0,1fr)]">
                <span className="text-xs font-semibold uppercase text-[#A1A1B5]">{label}</span>
                <span className="min-w-0 break-words font-mono text-sm text-white">{value}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-[#080910] px-4 py-3 text-sm leading-6 text-[#C2C4D2]">
            {review.orderType === "MARKET"
              ? "Market orders use the available market price. The final execution price may differ slightly from the displayed quote."
              : review.orderType === "LIMIT"
                ? "A Limit order waits for your price condition; the approximate value is not guaranteed execution."
                : review.orderType === "STOP_LOSS"
                  ? `This Stop-Loss waits for the trigger price ${formatCurrency(review.triggerPrice)} before it can execute.`
                  : `This Stop-Limit waits for trigger ${formatCurrency(review.triggerPrice)}, then uses limit ${formatCurrency(review.limitPrice)}.`}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onBack}
              disabled={submitting}
              className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan disabled:cursor-not-allowed disabled:opacity-60"
            >
              Back
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className="flex-1 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Confirming..." : "Confirm Order"}
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

const OrderResult = ({ result, onEdit }) => {
  if (!result) return null;
  const guidance = orderStatusGuidance[result.status] || orderStatusGuidance.Pending;
  const rejectionHelp = result.status === "Rejected" ? getRejectionGuidance(result.message) : null;
  const tone =
    result.status === "Rejected"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : result.status === "Executed"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        : "border-cyan/30 bg-cyan/10 text-[#C2C4D2]";

  return (
    <div className={`rounded-2xl border px-4 py-4 text-sm ${tone}`} role="status" aria-live="polite">
      <p className="font-semibold">{guidance.title}</p>
      <p className="mt-2 text-xs leading-5">{guidance.body}</p>
      {result.status === "Rejected" && result.message ? <p className="mt-2 text-xs">Reason: {result.message}</p> : null}
      {rejectionHelp ? (
        <div className="mt-3 rounded-xl border border-white/15 bg-black/10 p-3 text-xs leading-5">
          <p className="font-semibold">{rejectionHelp.title}</p>
          <p className="mt-1">{rejectionHelp.body}</p>
        </div>
      ) : null}
      {result.status === "Executed" ? (
        <div className="mt-3 space-y-1 text-xs">
          <p>Symbol: {result.symbol}</p>
          <p>Quantity: {result.quantity}</p>
          <p>Execution price: {formatCurrency(result.executionPrice)}</p>
          <p>Total amount: {formatCurrency(result.totalAmount)}</p>
          <p>Remaining virtual cash: {formatCurrency(result.balance)}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {result.status === "Executed" && result.side === "BUY" ? (
          <>
            <Link to="/portfolio" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Portfolio</Link>
            <Link to="/transactions" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Transactions</Link>
          </>
        ) : null}
        {result.status === "Executed" && result.side === "SELL" ? (
          <>
            <Link to="/positions" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Positions</Link>
            <Link to="/transactions" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Transactions</Link>
          </>
        ) : null}
        {["Pending", "Triggered"].includes(result.status) ? (
          <Link to="/orders" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Orders</Link>
        ) : null}
        {result.status === "Rejected" ? (
          <>
            <button type="button" onClick={onEdit} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">Edit Order</button>
            <Link to="/trading-guide" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Trading Guide</Link>
          </>
        ) : null}
        {result.status === "Cancelled" ? (
          <>
            <button type="button" onClick={onEdit} className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">Back to Stock</button>
            <Link to="/orders" className="rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10">View Orders</Link>
          </>
        ) : null}
      </div>
    </div>
  );
};

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
  const [review, setReview] = useState(null);

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
    if (!nextNeedsTrigger) setTriggerPrice("");
    if (!nextNeedsLimit) setLimitPrice("");
  };

  const validateOrder = useCallback(() => {
    const parsedQuantity = Number(quantity);
    if (!user) {
      setError("Sign in before placing an order");
      return null;
    }
    if (!symbol) {
      setError("Symbol is required");
      return null;
    }
    if (!String(symbol).toUpperCase().endsWith(".NS")) {
      setError("Select a valid NSE symbol before placing an order");
      return null;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      setError("Quantity must be a positive whole number");
      return null;
    }
    if (!hasValidPrice) {
      setError("Market price is unavailable. Try again after the quote loads.");
      return null;
    }
    if (side === "BUY" && Number.isFinite(availableCash) && estimatedNotional > availableCash) {
      setError("Insufficient virtual funds for this buy order");
      return null;
    }
    if (needsTrigger && (!Number.isFinite(Number(triggerPrice)) || Number(triggerPrice) <= 0)) {
      setError("Trigger price is required for stop orders");
      return null;
    }
    if (needsLimit && (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0)) {
      setError("Limit price is required for limit orders");
      return null;
    }
    if (orderType === "STOP_LIMIT" && side === "BUY" && Number(limitPrice) < Number(triggerPrice)) {
      setError("Buy stop-limit price must be greater than or equal to trigger price");
      return null;
    }
    if (orderType === "STOP_LIMIT" && side === "SELL" && Number(limitPrice) > Number(triggerPrice)) {
      setError("Sell stop-limit price must be less than or equal to trigger price");
      return null;
    }

    setError("");
    return {
      symbol: symbol.toUpperCase(),
      side,
      orderType,
      quantity: parsedQuantity,
      referencePrice: lastPrice,
      triggerPrice: needsTrigger ? Number(triggerPrice) : null,
      limitPrice: needsLimit ? Number(limitPrice) : null,
      estimatedNotional
    };
  }, [availableCash, estimatedNotional, hasValidPrice, lastPrice, limitPrice, needsLimit, needsTrigger, orderType, quantity, side, symbol, triggerPrice, user]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextReview = validateOrder();
    if (nextReview) {
      setResult(null);
      setReview(nextReview);
    }
  };

  const confirmSubmit = async () => {
    const nextReview = validateOrder();
    if (!nextReview) return;
    const parsedQuantity = nextReview.quantity;

    try {
      setSubmitting(true);
      setError("");
      setResult(null);
      const response = await api.post("/api/orders", {
        symbol: nextReview.symbol,
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
      const finalStatus = placedOrder?.status || "Pending";
      setReview(null);

      if (finalStatus === "Rejected") {
        const reason = placedOrder.rejectionReason || "Order was rejected";
        setError(reason);
        setResult({ status: "Rejected", message: reason, order: placedOrder, side });
        push(reason, "error");
        return;
      }

      if (finalStatus === "Executed") {
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
          balance: nextBalance,
          side
        });
        push(`Order placed successfully: ${placedOrder.symbol} x ${parsedQuantity}`, "success");
      } else {
        setResult({ status: finalStatus, order: placedOrder, side });
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
    <GlassPanel className="w-full min-w-0 space-y-6" data-tour="order-ticket">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-[#A1A1B5]">Order Ticket</p>
          <h3 className="mt-2 text-lg font-semibold text-white">Place and manage orders</h3>
        </div>
        <Link to="/orders" className="rounded-2xl border border-white/10 px-3 py-1 text-xs text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan">
          Order History
        </Link>
      </div>

      <MarketStatusBadge quote={quote} />

      <div className="rounded-2xl border border-white/10 bg-[#080910]/70 p-4">
        <p className="text-xs font-medium uppercase text-[#A1A1B5]">Symbol</p>
        <p className="mt-2 text-2xl font-semibold text-white">{symbol || "N/A"}</p>
        <p className="mt-2 text-xs text-[#A1A1B5]">
          Last traded price: <span className="text-white">{loading ? "Loading..." : hasValidPrice ? formatCurrency(lastPrice) : "Unavailable"}</span>
        </p>
        <p className="mt-1 flex items-center gap-2 text-xs text-[#A1A1B5]">
          Available virtual cash: <span className="text-white">{formatCurrency(availableCash)}</span>
          <HelpTooltip term="availableBalance" label="Available Balance" />
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
                side === item.value ? item.tone : "border-white/10 bg-[#080910]/60 text-[#C2C4D2] hover:border-white/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
          <span className="flex items-center gap-2">
            Order Type
            <HelpTooltip
              term={orderType === "MARKET" ? "marketOrder" : orderType === "LIMIT" ? "limitPrice" : orderType === "STOP_LOSS" ? "stopLoss" : "stopLimit"}
              label={getOrderTypeLabel(orderType)}
            />
          </span>
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
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <span className="normal-case leading-5 text-[#8F93A6]">
            {orderTypeHelperText[orderType]}{" "}
            <Link to="/trading-guide#order-types" className="font-semibold text-cyan hover:text-cyan-100">
              Which order type should I use?
            </Link>
          </span>
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
            <span className="flex items-center gap-2">
              Trigger Price
              <HelpTooltip term="triggerPrice" label="Trigger Price" />
            </span>
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
            <span className="flex items-center gap-2">
              Limit Price
              <HelpTooltip term="limitPrice" label="Limit Price" />
            </span>
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
              ? "Market orders use the current quote if sufficient virtual cash or holdings are available."
              : orderType === "LIMIT"
                ? "Limit orders sit pending until the market reaches your price."
                : orderType === "STOP_LOSS"
                  ? "Stop-Loss orders become active when the trigger price is reached."
                  : "Stop-Limit orders activate on the trigger, then wait for the limit price."}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={submitting || loading || !hasValidPrice}
            className="flex-1 rounded-2xl border border-cyan/60 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review Order
          </button>
          <Link to="/orders" className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan">
            Track Orders
          </Link>
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <OrderResult result={result} onEdit={() => setResult(null)} />
      </form>

      <OrderReviewModal
        open={Boolean(review)}
        review={review}
        submitting={submitting}
        onBack={() => setReview(null)}
        onConfirm={confirmSubmit}
      />
    </GlassPanel>
  );
};

export default OrderTicket;
