import GlassPanel from "./GlassPanel";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) => (Number.isFinite(Number(value)) ? currency.format(Number(value)) : "—");

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const statusTone = {
  Pending: "text-[#C2C4D2] border-white/10 bg-[#1A1B2B]",
  Triggered: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  Executed: "text-cyan border-cyan/30 bg-cyan/10",
  Cancelled: "text-[#C2C4D2] border-white/10 bg-[#080910]",
  Rejected: "text-red-400 border-red-500/30 bg-red-500/10"
};

const OrderDetailsModal = ({ order, open, onClose, onCancel, cancelling }) => {
  if (!open || !order) return null;

  const steps = [
    { label: "Placed", done: true },
    {
      label: order.stopTriggeredAt ? "Triggered" : "Waiting",
      done: Boolean(order.stopTriggeredAt) || order.status === "Executed"
    },
    { label: order.status, done: order.status !== "Pending" }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <GlassPanel className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-[#A1A1B5]">Order Details</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{order.symbol}</h3>
            <p className="mt-1 text-sm text-[#C2C4D2]">{order.companyName}</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[order.status] || statusTone.Pending}`}>
            {order.status}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            { label: "Side", value: order.side },
            { label: "Order Type", value: order.orderType },
            { label: "Quantity", value: order.quantity },
            { label: "Trigger Price", value: formatCurrency(order.triggerPrice) },
            { label: "Limit Price", value: formatCurrency(order.limitPrice) },
            { label: "Execution Price", value: formatCurrency(order.executionPrice) },
            { label: "Executed Qty", value: order.executedQuantity || 0 },
            { label: "Placed At", value: formatDate(order.createdAt) },
            { label: "Triggered At", value: formatDate(order.stopTriggeredAt) },
            { label: "Executed At", value: formatDate(order.executedAt) },
            { label: "Cancelled At", value: formatDate(order.cancelledAt) }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-4">
              <p className="text-[11px] uppercase text-[#A1A1B5]">{item.label}</p>
              <p className="mt-2 font-mono text-sm text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#080910] px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            {steps.map((step, index) => (
              <div key={step.label} className="flex flex-1 items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${step.done ? "bg-cyan" : "bg-slate-600"}`} />
                <span className={`text-xs uppercase ${step.done ? "text-white" : "text-[#6F7487]"}`}>
                  {step.label}
                </span>
                {index < steps.length - 1 ? <span className="mx-2 h-px flex-1 bg-borderGlow" /> : null}
              </div>
            ))}
          </div>
        </div>

        {order.stopTriggeredAt ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#080910] px-4 py-4 text-sm text-[#C2C4D2]">
            Stop trigger activated at {formatDate(order.stopTriggeredAt)}
          </div>
        ) : null}

        {order.rejectionReason ? (
          <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {order.rejectionReason}
          </div>
        ) : null}

        {order.cancellationReason ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-[#C2C4D2]">
            {order.cancellationReason}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
          >
            Close
          </button>
          {["Pending", "Triggered"].includes(order.status) && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              className="flex-1 rounded-2xl border border-red-400/70 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelling ? "Cancelling..." : "Cancel Order"}
            </button>
          ) : null}
        </div>
      </GlassPanel>
    </div>
  );
};

export default OrderDetailsModal;
