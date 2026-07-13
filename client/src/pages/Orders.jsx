import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import OrderDetailsModal from "../components/OrderDetailsModal";
import api from "../utils/api";
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
  Pending: "text-amber-300 border-amber-400/40 bg-amber-400/10",
  Executed: "text-cyan-300 border-cyan-400/40 bg-cyan-400/10",
  Cancelled: "text-slate-300 border-borderGlow/60 bg-base/70",
  Rejected: "text-red-300 border-red-400/40 bg-red-400/10"
};

const sideTone = {
  BUY: "text-cyan-300",
  SELL: "text-red-300"
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
      setError(err?.response?.data?.message || "Failed to load orders");
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
      { total: 0, pending: 0, executed: 0, cancelled: 0, rejected: 0 }
    );
  }, [orders]);

  const openDetails = async (order) => {
    try {
      const response = await api.get(`/api/orders/${order._id}`);
      setSelectedOrder(response.data);
      setModalOpen(true);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load order details");
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
      setError(err?.response?.data?.message || "Failed to cancel order");
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
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel>
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-1 min-w-[180px] flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Symbol
            <input
              value={symbolFilter}
              onChange={(event) => setSymbolFilter(event.target.value)}
              placeholder="RELIANCE"
              className="rounded-xl border border-borderGlow/60 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-borderGlow/60 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
            >
              <option value="">All statuses</option>
              {['Pending', 'Executed', 'Cancelled', 'Rejected'].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
            Order Type
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-borderGlow/60 bg-base/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
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
            className="rounded-xl border border-cyan-400/70 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/20"
          >
            Refresh
          </button>
          <Link
            to="/portfolio"
            className="rounded-xl border border-borderGlow/60 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-cyan-300"
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
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Order History</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Recent orders</h3>
          </div>
          <span className="text-xs text-slate-400">Tap a row for details</span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-borderGlow/60">
          <div className="hidden bg-base/80 px-4 py-3 text-[11px] uppercase tracking-[0.25em] text-slate-400 md:grid md:grid-cols-12 md:gap-3">
            <span className="md:col-span-2">Symbol</span>
            <span className="md:col-span-1">Side</span>
            <span className="md:col-span-2">Type</span>
            <span className="md:col-span-1">Qty</span>
            <span className="md:col-span-2">Status</span>
            <span className="md:col-span-2">Execution</span>
            <span className="md:col-span-2">Updated</span>
          </div>

          <div className="divide-y divide-borderGlow/50">
            {loading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="px-4 py-4">
                    <Skeleton className="h-5 w-full" />
                  </div>
                ))
              : orders.length === 0
                ? (
                  <div className="px-4 py-10 text-center text-sm text-slate-400">
                    No orders found. Place a market, limit, stop loss, or stop limit order to start tracking.
                  </div>
                )
                : orders.map((order) => (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => openDetails(order)}
                    className="grid w-full grid-cols-1 gap-2 px-4 py-4 text-left transition hover:bg-base/60 md:grid-cols-12 md:gap-3"
                  >
                    <span className="md:col-span-2">
                      <span className="block text-sm font-semibold text-white">{order.symbol}</span>
                      <span className="block text-xs text-slate-400">{order.companyName}</span>
                    </span>
                    <span className={`md:col-span-1 text-sm font-semibold ${sideTone[order.side] || 'text-slate-300'}`}>
                      {order.side}
                    </span>
                    <span className="md:col-span-2 text-sm text-slate-300">{order.orderType.replace('_', ' ')}</span>
                    <span className="md:col-span-1 text-sm text-white">{order.quantity}</span>
                    <span className="md:col-span-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${badgeTone[order.status] || badgeTone.Pending}`}>
                        {order.status}
                      </span>
                    </span>
                    <span className="md:col-span-2 text-sm text-slate-300">
                      {order.executionPrice ? formatCurrency(order.executionPrice) : order.orderType === 'MARKET' ? 'Queued' : 'Pending'}
                    </span>
                    <span className="md:col-span-2 text-sm text-slate-400">{formatDate(order.updatedAt)}</span>
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