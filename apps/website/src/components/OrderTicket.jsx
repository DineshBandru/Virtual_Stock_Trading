import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus } from "lucide-react";
import GlassPanel from "./GlassPanel";
import HelpTooltip from "./HelpTooltip";
import { getRejectionGuidance, orderStatusGuidance } from "../data/beginnerGuidance";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import { getNseMarketStatus } from "../utils/marketStatus";
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
  MARKET: "Attempts to trade at the available market price when execution is allowed.",
  LIMIT: "Limit waits for your chosen price or better. It may stay Pending if the price is not reached.",
  STOP_LOSS: "Stop-Loss waits for a trigger price before trying to exit a holding.",
  STOP_LIMIT: "Stop-Limit waits for a trigger, then behaves like a Limit order with your price control."
};

const sanitizeQuantity = (value) => {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const parsed = Number(digits);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : "";
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
  const [holdingQuantity, setHoldingQuantity] = useState(0);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [review, setReview] = useState(null);

  const lastPrice = Number(quote?.c);
  const hasValidPrice = Number.isFinite(lastPrice) && lastPrice > 0;
  const availableCash = Number(user?.balance);
  const marketStatus = getNseMarketStatus(quote);
  const needsTrigger = orderType === "STOP_LOSS" || orderType === "STOP_LIMIT";
  const needsLimit = orderType === "LIMIT" || orderType === "STOP_LIMIT";
  const estimatedPrice = needsLimit && Number.isFinite(Number(limitPrice)) && Number(limitPrice) > 0
    ? Number(limitPrice)
    : hasValidPrice
      ? lastPrice
      : null;
  const parsedQuantity = Number(quantity);
  const hasQuantity = Number.isInteger(parsedQuantity) && parsedQuantity > 0;
  const estimatedNotional = useMemo(() => {
    if (!hasQuantity || !Number.isFinite(estimatedPrice)) {
      return 0;
    }
    return parsedQuantity * estimatedPrice;
  }, [estimatedPrice, hasQuantity, parsedQuantity]);

  useEffect(() => {
    let active = true;

    const loadHolding = async () => {
      if (!symbol || !user) {
        setHoldingQuantity(0);
        return;
      }

      try {
        setHoldingsLoading(true);
        const response = await api.get("/api/portfolio");
        const holdings = Array.isArray(response.data) ? response.data : [];
        const currentHolding = holdings.find((item) => String(item.symbol || "").toUpperCase() === String(symbol).toUpperCase());
        if (active) {
          setHoldingQuantity(Number(currentHolding?.quantity) || 0);
        }
      } catch {
        if (active) {
          setHoldingQuantity(0);
        }
      } finally {
        if (active) {
          setHoldingsLoading(false);
        }
      }
    };

    loadHolding();
    return () => {
      active = false;
    };
  }, [symbol, user]);

  const resetPriceFields = (nextOrderType) => {
    const nextNeedsTrigger = nextOrderType === "STOP_LOSS" || nextOrderType === "STOP_LIMIT";
    const nextNeedsLimit = nextOrderType === "LIMIT" || nextOrderType === "STOP_LIMIT";
    if (!nextNeedsTrigger) setTriggerPrice("");
    if (!nextNeedsLimit) setLimitPrice("");
  };

  const updateQuantity = (value) => {
    setQuantity(sanitizeQuantity(value));
    setError("");
  };

  const stepQuantity = (direction) => {
    setQuantity((current) => {
      const currentValue = Number(current);
      const base = Number.isInteger(currentValue) && currentValue > 0 ? currentValue : 1;
      const nextValue = direction === "up" ? base + 1 : Math.max(1, base - 1);
      return String(nextValue);
    });
    setError("");
  };

  const reviewDisabledReason = useMemo(() => {
    if (!user) return "Sign in before placing an order.";
    if (!symbol) return "Symbol is required.";
    if (!String(symbol).toUpperCase().endsWith(".NS")) return "Select a valid NSE symbol before placing an order.";
    if (!hasValidPrice) return "Market price is unavailable. Try again after the quote loads.";
    if (!quantity) return "Enter a quantity to continue.";
    if (!hasQuantity) return "Quantity must be a positive whole number.";
    if (side === "BUY" && Number.isFinite(availableCash) && estimatedNotional > availableCash) {
      return "Insufficient virtual funds for this buy order.";
    }
    if (side === "SELL" && parsedQuantity > holdingQuantity) {
      return `You only own ${holdingQuantity.toLocaleString("en-IN")} ${holdingQuantity === 1 ? "share" : "shares"}. Reduce the quantity to continue.`;
    }
    if (needsTrigger && (!Number.isFinite(Number(triggerPrice)) || Number(triggerPrice) <= 0)) {
      return "Enter a valid Trigger Price.";
    }
    if (needsLimit && (!Number.isFinite(Number(limitPrice)) || Number(limitPrice) <= 0)) {
      return "Enter a valid Limit Price.";
    }
    if (orderType === "STOP_LIMIT" && side === "BUY" && Number(limitPrice) < Number(triggerPrice)) {
      return "Buy stop-limit price must be greater than or equal to trigger price.";
    }
    if (orderType === "STOP_LIMIT" && side === "SELL" && Number(limitPrice) > Number(triggerPrice)) {
      return "Sell stop-limit price must be less than or equal to trigger price.";
    }
    return "";
  }, [availableCash, estimatedNotional, hasQuantity, hasValidPrice, holdingQuantity, limitPrice, needsLimit, needsTrigger, orderType, parsedQuantity, quantity, side, symbol, triggerPrice, user]);

  const validateOrder = useCallback(() => {
    if (reviewDisabledReason) {
      setError(reviewDisabledReason);
      return null;
    }

    setError("");
    return {
      symbol: symbol.toUpperCase(),
      side,
      orderType,
      quantity: Number(quantity),
      referencePrice: lastPrice,
      triggerPrice: needsTrigger ? Number(triggerPrice) : null,
      limitPrice: needsLimit ? Number(limitPrice) : null,
      estimatedNotional
    };
  }, [estimatedNotional, lastPrice, limitPrice, needsLimit, needsTrigger, orderType, quantity, reviewDisabledReason, side, symbol, triggerPrice]);

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

  const holdingText = holdingsLoading ? "Loading holdings..." : `${holdingQuantity.toLocaleString("en-IN")} ${holdingQuantity === 1 ? "share" : "shares"}`;
  const remainingAfterSell = hasQuantity ? Math.max(0, holdingQuantity - parsedQuantity) : holdingQuantity;
  const orderTypeName = getOrderTypeLabel(orderType);
  const marketConsequence = marketStatus.open
    ? `${marketStatus.displayState} - eligible Market orders may execute when submitted.`
    : `${marketStatus.displayState} - this Market order will remain Pending until the next valid session.`;

  return (
    <GlassPanel className="w-full min-w-0 space-y-5" data-tour="order-ticket">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-cyan">Place Order</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{symbol || "Select a stock"}</h3>
        </div>
        <Link to="/orders" className="rounded-lg border border-white/10 px-3 py-1 text-xs text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan">
          Order History
        </Link>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "BUY",
              label: "BUY",
              caption: "Use virtual cash",
              tone: "border-emerald-500/50 bg-emerald-50 shadow-sm shadow-emerald-500/10 dark:border-emerald-500/40 dark:bg-emerald-500/10"
            },
            {
              value: "SELL",
              label: "SELL",
              caption: "Exit owned shares",
              tone: "border-red-500/50 bg-red-50 shadow-sm shadow-red-500/10 dark:border-red-500/40 dark:bg-red-500/10"
            }
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setSide(item.value);
                setError("");
              }}
              aria-pressed={side === item.value}
              className={`order-side-option order-side-${item.value.toLowerCase()} min-h-16 rounded-lg border px-4 py-3 text-left transition ${
                side === item.value ? item.tone : "border-white/10 bg-[var(--bg-surface-raised)] hover:border-cyan/30 hover:bg-[var(--bg-muted)]"
              }`}
            >
              <span
                className={`order-side-label block text-base font-bold ${
                  side === item.value
                    ? item.value === "BUY"
                      ? "text-emerald-800 dark:text-emerald-100"
                      : "text-red-800 dark:text-red-100"
                    : "text-slate-900 dark:text-slate-100"
                }`}
              >
                {item.label}
              </span>
              <span
                className={`order-side-caption mt-1 block text-xs font-medium ${
                  side === item.value
                    ? item.value === "BUY"
                      ? "text-emerald-700 dark:text-emerald-200"
                      : "text-red-700 dark:text-red-200"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                {item.caption}
              </span>
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-white/10 bg-[#080910]/70 p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase text-[#A1A1B5]">Current Price</p>
              <p className="mt-1 font-mono text-lg font-semibold text-white">
                {loading ? "Loading..." : hasValidPrice ? formatCurrency(lastPrice) : "Unavailable"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-[#A1A1B5]">
                {side === "BUY" ? "Available Balance" : "Shares You Own"}
              </p>
              <p className="mt-1 flex items-center gap-2 font-mono text-lg font-semibold text-white">
                {side === "BUY" ? formatCurrency(availableCash) : holdingText}
                {side === "BUY" ? <HelpTooltip term="availableBalance" label="Available Balance" /> : null}
              </p>
            </div>
          </div>
          {side === "SELL" ? (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-xs leading-5 ${
              holdingQuantity > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            }`}>
              {holdingQuantity > 0
                ? `Available to sell: ${holdingText}.`
                : "You don't currently own this stock. Buy shares before trying to sell."}
            </div>
          ) : null}
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
              setError("");
            }}
            className="rounded-lg border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
          >
            {orderTypes.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <span className="normal-case leading-5 text-[#8F93A6]">
            <span className="font-semibold text-[#C2C4D2]">{orderTypeName} Order.</span> {orderTypeHelperText[orderType]}{" "}
            <Link to="/trading-guide#order-types" className="font-semibold text-cyan hover:text-cyan-100">
              Which order type should I use?
            </Link>
          </span>
        </label>

        <div className="rounded-lg border border-white/10 bg-[#080910]/70 p-4">
          <div className="flex items-center gap-2">
            <label htmlFor="order-quantity" className="text-xs font-semibold uppercase text-[#A1A1B5]">
              Quantity
            </label>
            <HelpTooltip term="quantity" label="Quantity" />
          </div>
          <p className="mt-1 text-xs text-[#8F93A6]">Quantity means how many shares you want to buy or sell.</p>
          <div className="mt-3 grid grid-cols-[48px_minmax(0,1fr)_48px] gap-2">
            <button
              type="button"
              onClick={() => stepQuantity("down")}
              aria-label="Decrease quantity"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-panel text-white transition hover:border-cyan/40 hover:text-cyan"
            >
              <Minus className="h-5 w-5" aria-hidden="true" />
            </button>
            <input
              id="order-quantity"
              inputMode="numeric"
              pattern="[0-9]*"
              value={quantity}
              onChange={(event) => updateQuantity(event.target.value)}
              className="min-h-12 rounded-lg border border-white/10 bg-[var(--bg-input)] px-4 text-center text-xl font-semibold text-white outline-none focus:border-cyan"
              placeholder="Enter number of shares"
            />
            <button
              type="button"
              onClick={() => stepQuantity("up")}
              aria-label="Increase quantity"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-white/10 bg-panel text-white transition hover:border-cyan/40 hover:text-cyan"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mt-3 text-sm font-medium text-[#C2C4D2]">
            {hasQuantity
              ? `You are ${side === "BUY" ? "buying" : "selling"} ${parsedQuantity.toLocaleString("en-IN")} ${parsedQuantity === 1 ? "share" : "shares"}.`
              : "Enter number of shares."}
          </p>
        </div>

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
              onChange={(event) => {
                setTriggerPrice(event.target.value);
                setError("");
              }}
              className="rounded-lg border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
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
              onChange={(event) => {
                setLimitPrice(event.target.value);
                setError("");
              }}
              className="rounded-lg border border-white/10 bg-[#080910]/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan"
              placeholder="Execution limit"
            />
          </label>
        ) : null}

        <div className="rounded-lg border border-cyan/20 bg-cyan/10 px-4 py-4 text-sm text-[#C2C4D2]">
          <p className="text-xs font-semibold uppercase text-cyan">Order Estimate</p>
          <div className="mt-3 flex flex-col gap-1">
            <span className="font-mono text-sm text-white">
              {hasQuantity && Number.isFinite(estimatedPrice)
                ? `${parsedQuantity.toLocaleString("en-IN")} ${parsedQuantity === 1 ? "share" : "shares"} x ${formatCurrency(estimatedPrice)}`
                : "Enter quantity to calculate estimate"}
            </span>
            <span className="font-mono text-2xl font-semibold text-white">Approx. {formatCurrency(estimatedNotional)}</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-[#8F93A6]">
            {side === "BUY"
              ? `Approximate amount from virtual balance: ${formatCurrency(estimatedNotional)}.`
              : `Approximate sale value: ${formatCurrency(estimatedNotional)}.`}
          </p>
          {hasQuantity ? (
            <p className="mt-3 text-sm leading-6 text-white">
              {side === "BUY"
                ? `You are buying ${parsedQuantity.toLocaleString("en-IN")} ${parsedQuantity === 1 ? "share" : "shares"} of ${symbol} using virtual money.`
                : `You are selling ${parsedQuantity.toLocaleString("en-IN")} of your ${holdingQuantity.toLocaleString("en-IN")} shares. ${remainingAfterSell.toLocaleString("en-IN")} shares will remain if this order executes.`}
            </p>
          ) : null}
          {orderType === "MARKET" ? (
            <p className="mt-3 text-xs leading-5 text-[#8F93A6]">
              Final execution price may differ slightly from the displayed quote.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border border-white/10 bg-[#080910]/70 px-4 py-3 text-xs leading-5 text-[#A1A1B5]">
          {orderType === "MARKET" ? marketConsequence : `${orderTypeName} order - execution depends on your entered price condition and market availability.`}
        </div>

        {reviewDisabledReason ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {reviewDisabledReason}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={submitting || loading || Boolean(reviewDisabledReason)}
            className="flex-1 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Review Order
          </button>
          <Link to="/orders" className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan">
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
