import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import HelpTooltip from "../components/HelpTooltip";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import OrderDetailsModal from "../components/OrderDetailsModal";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "—";

const formatDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const badgeTone = {
  Pending: "text-[#C2C4D2] border-white/10 bg-[#1A1B2B]",
  Triggered: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  Executed: "text-cyan border-cyan/30 bg-cyan/10",
  Cancelled: "text-[#C2C4D2] border-white/10 bg-[#080910]",
  Rejected: "text-red-400 border-red-500/30 bg-red-500/10"
};

const sideTone = {
  BUY: "text-cyan",
  SELL: "text-red-400"
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [symbolFilter, setSymbolFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/orders", {
        params: {
          status: statusFilter || undefined,
          orderType: typeFilter || undefined,
          symbol: symbolFilter || undefined
        }
      });
      setOrders(response.data || []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load orders"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, symbolFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const handleUpdate = () => {
      loadOrders();
    };

    socket.on("orders:update", handleUpdate);
    const interval = setInterval(handleUpdate, 15000);

    return () => {
      socket.off("orders:update", handleUpdate);
      clearInterval(interval);
    };
  }, [loadOrders]);

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.total += 1;
        acc[order.status.toLowerCase()] += 1;
        return acc;
      },
      { total: 0, pending: 0, triggered: 0, executed: 0, cancelled: 0, rejected: 0 }
    );
  }, [orders]);

  const openDetails = async (order) => {
    try {
      const response = await api.get(`/api/orders/${order._id}`);
      setSelectedOrder(response.data);
      setModalOpen(true);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load order details"));
    }
  };

  const cancelSelectedOrder = async () => {
    if (!selectedOrder) return;
    try {
      setCancelling(true);
      await api.post(`/api/orders/${selectedOrder._id}/cancel`);
      setModalOpen(false);
      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel order"));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Order Management"
        subtitle="Track market, limit, stop loss, and stop limit orders with live status updates."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Orders", value: totals.total },
          { label: "Pending", value: totals.pending },
          { label: "Executed", value: totals.executed },
          { label: "Cancelled / Rejected", value: `${totals.cancelled} / ${totals.rejected}` }
        ].map((item) => (
          <GlassPanel key={item.label}>
            <p className="flex items-center gap-2 text-[11px] uppercase text-[#A1A1B5]">
              {item.label}
              {item.label === "Pending" ? <HelpTooltip term="pending" label="Pending" /> : null}
              {item.label === "Executed" ? <HelpTooltip term="executed" label="Executed" /> : null}
              {item.label === "Cancelled / Rejected" ? <HelpTooltip term="rejected" label="Rejected" /> : null}
            </p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="border-cyan/20 bg-cyan/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan">Order lifecycle</p>
            <p className="mt-2 text-sm leading-6 text-[#C2C4D2]">
              Pending and Triggered orders are still waiting. Executed orders become Transactions. Rejected or Cancelled orders did not create a trade.
            </p>
          </div>
          <Link to="/trading-guide#order-lifecycle" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan">
            Learn Lifecycle
          </Link>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-1 min-w-[180px] flex-col gap-2 text-[11px] uppercase text-[#A1A1B5]">
            Symbol
            <input
              value={symbolFilter}
              onChange={(event) => setSymbolFilter(event.target.value)}
              placeholder="RELIANCE"
              className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none focus:border-cyan"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-2 text-[11px] uppercase text-[#A1A1B5]">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none focus:border-cyan"
            >
              <option value="">All statuses</option>
              {['Pending', 'Triggered', 'Executed', 'Cancelled', 'Rejected'].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-2 text-[11px] uppercase text-[#A1A1B5]">
            Order Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none focus:border-cyan"
            >
              <option value="">All types</option>
              {['MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LIMIT'].map((type) => (
                <option key={type} value={type}>
                  {type.replace('_', ' ')}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={loadOrders}
            className="rounded-2xl border border-cyan/70 bg-cyan/10 px-4 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20"
          >
            Refresh
          </button>
          <Link
            to="/portfolio"
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
          >
            Portfolio
          </Link>
        </div>
      </GlassPanel>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <GlassPanel>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-[#A1A1B5]">Order History</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Recent orders</h3>
          </div>
          <span className="text-xs text-[#A1A1B5]">Tap a row for details</span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10" data-tour="orders-view">
          <div className="hidden bg-[#080910] px-4 py-3 text-[11px] uppercase text-[#A1A1B5] md:grid md:grid-cols-12 md:gap-3">
            <span className="md:col-span-2">Symbol</span>
            <span className="md:col-span-1">Side</span>
            <span className="md:col-span-2">Type</span>
            <span className="md:col-span-1">Qty</span>
            <span className="md:col-span-2 flex items-center gap-2">
              Status
              <HelpTooltip term="pending" label="Order Status" />
            </span>
            <span className="md:col-span-2">Execution</span>
            <span className="md:col-span-2">Updated</span>
          </div>

          <div className="divide-y divide-white/10">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-4 py-4">
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))
              : orders.length === 0
                ? (
                  <div className="px-4 py-10 text-center text-sm text-[#A1A1B5]">
                    <p className="font-semibold text-white">No orders yet.</p>
                    <p className="mt-2">Orders you place will appear here with their current status.</p>
                    <Link to="/" className="mt-4 inline-flex rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
                      Search Stocks
                    </Link>
                  </div>
                )
                : orders.map((order) => (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => openDetails(order)}
                    className="grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition hover:bg-[#080910] md:grid-cols-12 md:gap-3"
                  >
                    <span className="md:col-span-2">
                      <span className="block text-sm font-semibold text-white">{order.symbol}</span>
                      <span className="block text-xs text-[#A1A1B5]">{order.companyName}</span>
                    </span>
                    <span className={`md:col-span-1 text-sm font-semibold ${sideTone[order.side] || 'text-[#C2C4D2]'}`}>
                      {order.side}
                    </span>
                    <span className="md:col-span-2 text-sm text-[#C2C4D2]">{order.orderType.replace('_', ' ')}</span>
                    <span className="md:col-span-1 text-sm text-white">{order.quantity}</span>
                    <span className="md:col-span-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone[order.status] || badgeTone.Pending}`}>
                        {order.status}
                      </span>
                    </span>
                    <span className="md:col-span-2 text-sm text-[#C2C4D2]">
                      {order.executionPrice ? formatCurrency(order.executionPrice) : order.orderType === 'MARKET' ? 'Queued' : 'Pending'}
                    </span>
                    <span className="md:col-span-2 text-sm text-[#A1A1B5]">
                      {formatDate(order.executedAt || order.cancelledAt || order.updatedAt)}
                    </span>
                  </button>
                ))}
          </div>
        </div>
      </GlassPanel>

      <OrderDetailsModal
        open={modalOpen}
        order={selectedOrder}
        onClose={() => setModalOpen(false)}
        onCancel={cancelSelectedOrder}
        cancelling={cancelling}
      />
    </div>
  );
};

export default Orders;
