import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import HelpTooltip from "../components/HelpTooltip";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const number = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "-";

const formatQuantity = (value) =>
  Number.isFinite(Number(value)) ? number.format(Number(value)) : "-";

const formatDateTime = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getRealizedPnL = (transaction) => {
  const value =
    transaction.realizedPnL ??
    transaction.realizedPnl ??
    transaction.pnl ??
    transaction.profitLoss;

  return Number.isFinite(Number(value)) ? Number(value) : null;
};

const typeTone = {
  BUY: "border-cyan/30 bg-cyan/10 text-cyan",
  SELL: "border-red-500/30 bg-red-500/10 text-red-400"
};

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get("/api/transactions");
        if (active) {
          setTransactions(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (active) {
          setError(getApiErrorMessage(err, "Failed to load transactions"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    const refreshTransactions = () => {
      loadTransactions();
    };

    socket.on("transaction-update", refreshTransactions);
    socket.on("order-update", refreshTransactions);
    socket.on("connect", refreshTransactions);

    return () => {
      active = false;
      socket.off("transaction-update", refreshTransactions);
      socket.off("order-update", refreshTransactions);
      socket.off("connect", refreshTransactions);
    };
  }, []);

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        const amount = Number(transaction.total) || 0;
        acc.count += 1;
        acc.turnover += amount;

        if (transaction.type === "BUY") {
          acc.buys += 1;
        }

        if (transaction.type === "SELL") {
          acc.sells += 1;
        }

        return acc;
      },
      { count: 0, buys: 0, sells: 0, turnover: 0 }
    );
  }, [transactions]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaction History"
        subtitle="Review every executed buy and sell with quantity, price, value, and timestamps."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Transactions", value: totals.count },
          { label: "Buy Trades", value: totals.buys },
          { label: "Sell Trades", value: totals.sells },
          { label: "Total Turnover", value: formatCurrency(totals.turnover) }
        ].map((item) => (
          <GlassPanel key={item.label}>
            <p className="text-[11px] uppercase text-[#A1A1B5]">{item.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">{item.value}</p>
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="border-cyan/20 bg-cyan/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-cyan">What next?</p>
            <p className="mt-2 text-sm leading-6 text-[#C2C4D2]">
              Transactions show only trades that actually executed. If an order is Pending, Triggered, Cancelled, or Rejected, review it in Order Management.
            </p>
          </div>
          <Link to="/orders" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan">
            View Orders
          </Link>
        </div>
      </GlassPanel>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <GlassPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-[#A1A1B5]">Ledger</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Executed transactions</h3>
          </div>
          <span className="text-xs text-[#A1A1B5]">{transactions.length} records</span>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10" data-tour="transactions-view">
          <div className="hidden bg-[#080910] px-4 py-3 text-[11px] uppercase text-[#A1A1B5] lg:grid lg:grid-cols-12 lg:gap-3">
            <span className="lg:col-span-2">Stock</span>
            <span className="lg:col-span-1">Type</span>
            <span className="lg:col-span-1 text-right">Qty</span>
            <span className="lg:col-span-2 text-right">Price</span>
            <span className="lg:col-span-2 text-right">Amount</span>
            <span className="lg:col-span-2 flex items-center justify-end gap-2 text-right">
              Realized P/L
              <HelpTooltip term="realizedPnl" label="Realized P&L" />
            </span>
            <span className="lg:col-span-2 text-right">Date</span>
          </div>

          <div className="divide-y divide-white/10">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="px-4 py-4">
                  <Skeleton className="h-5 w-full" />
                </div>
              ))
            ) : transactions.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-[#A1A1B5]">
                <p className="font-semibold text-white">No transactions yet.</p>
                <p className="mt-2">Successfully executed trades will appear here.</p>
                <Link to="/" className="mt-4 inline-flex rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100">
                  Search Stocks
                </Link>
              </div>
            ) : (
              transactions.map((transaction) => {
                const realizedPnL = getRealizedPnL(transaction);
                const pnlTone =
                  realizedPnL === null
                    ? "text-[#A1A1B5]"
                    : realizedPnL >= 0
                      ? "text-emerald-400"
                      : "text-red-400";

                return (
                  <div
                    key={transaction._id}
                    className="grid grid-cols-2 gap-3 px-4 py-4 text-sm transition hover:bg-[#080910] lg:grid-cols-12 lg:items-center"
                  >
                    <div className="col-span-2 lg:col-span-2">
                      <p className="font-semibold text-white">{transaction.symbol || "-"}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-[#A1A1B5]">
                        {transaction.companyName || "Company not available"}
                      </p>
                    </div>

                    <div className="lg:col-span-1">
                      <span className="mb-1 block text-[11px] uppercase text-[#6F7487] lg:hidden">
                        Type
                      </span>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
                          typeTone[transaction.type] || "border-white/10 bg-[#080910] text-[#C2C4D2]"
                        }`}
                      >
                        {transaction.type || "-"}
                      </span>
                    </div>

                    <div className="text-right lg:col-span-1">
                      <span className="mb-1 block text-[11px] uppercase text-[#6F7487] lg:hidden">
                        Qty
                      </span>
                      <span className="font-medium text-white">{formatQuantity(transaction.quantity)}</span>
                    </div>

                    <div className="text-left lg:col-span-2 lg:text-right">
                      <span className="mb-1 block text-[11px] uppercase text-[#6F7487] lg:hidden">
                        Price
                      </span>
                      <span className="text-[#C2C4D2]">{formatCurrency(transaction.price)}</span>
                    </div>

                    <div className="text-right lg:col-span-2">
                      <span className="mb-1 block text-[11px] uppercase text-[#6F7487] lg:hidden">
                        Amount
                      </span>
                      <span className="font-semibold text-white">{formatCurrency(transaction.total)}</span>
                    </div>

                    <div className={`text-left font-semibold lg:col-span-2 lg:text-right ${pnlTone}`}>
                      <span className="mb-1 block text-[11px] uppercase text-[#6F7487] lg:hidden">
                        Realized P/L
                      </span>
                      {realizedPnL === null ? "-" : formatCurrency(realizedPnL)}
                    </div>

                    <div className="text-right text-[#A1A1B5] lg:col-span-2">
                      <span className="mb-1 block text-[11px] uppercase text-[#6F7487] lg:hidden">
                        Date
                      </span>
                      {formatDateTime(transaction.timestamp || transaction.createdAt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Transactions;
