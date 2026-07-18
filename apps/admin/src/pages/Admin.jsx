import { useEffect, useMemo, useState } from "react";
import { CircleAlert, RefreshCcw } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const number = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "-";

const formatNumber = (value) =>
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

const typeTone = {
  BUY: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  SELL: "border-red-400/40 bg-red-400/10 text-red-300"
};

const roleTone = {
  admin: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  user: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
};

const StatCard = ({ label, value, detail }) => (
  <GlassPanel className="min-h-[126px]">
    <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">{value}</p>
    {detail ? <p className="mt-2 text-xs text-slate-400">{detail}</p> : null}
  </GlassPanel>
);

const LoadingCard = () => (
  <GlassPanel className="min-h-[126px]">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="mt-4 h-8 w-2/3" />
    <Skeleton className="mt-3 h-3 w-1/2" />
  </GlassPanel>
);

const Admin = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState("users");

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError("");
      const [statsRes, usersRes, transactionsRes] = await Promise.all([
        api.get("/api/admin/stats"),
        api.get("/api/admin/users"),
        api.get("/api/admin/transactions")
      ]);

      setStats(statsRes.data || null);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load admin data"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const derived = useMemo(() => {
    const totalVolume = transactions.reduce(
      (sum, transaction) => sum + (Number(transaction.total) || 0),
      0
    );
    const buyCount = transactions.filter((transaction) => transaction.type === "BUY").length;
    const sellCount = transactions.filter((transaction) => transaction.type === "SELL").length;
    const recentUsers = [...users]
      .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
      .slice(0, 5);
    const recentTransactions = transactions.slice(0, 5);

    return {
      totalVolume,
      buyCount,
      sellCount,
      recentUsers,
      recentTransactions
    };
  }, [transactions, users]);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Admin Control" subtitle="Monitor users, trading activity, and platform stats." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <GlassPanel><Skeleton className="h-[320px] w-full rounded-2xl" /></GlassPanel>
          <GlassPanel><Skeleton className="h-[320px] w-full rounded-2xl" /></GlassPanel>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Admin Control" subtitle="Monitor users, trading activity, and platform stats." />
        <GlassPanel className="border-red-500/30 bg-red-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-200">
                <CircleAlert className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em]">Admin data unavailable</h3>
              </div>
              <p className="mt-3 text-sm text-red-100/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadAdminData}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Admin Control"
        subtitle="Monitor registered users, transaction activity, and available platform totals."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={formatNumber(stats?.totalUsers ?? users.length)} detail="Registered accounts" />
        <StatCard label="Total Orders" value="Unavailable" detail="No admin orders endpoint exists yet" />
        <StatCard
          label="Total Transactions"
          value={formatNumber(stats?.totalTransactions ?? transactions.length)}
          detail={`${formatNumber(derived.buyCount)} buys / ${formatNumber(derived.sellCount)} sells`}
        />
        <StatCard label="Trading Volume" value={formatCurrency(derived.totalVolume)} detail="Calculated from admin transactions" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Recent Users</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Newest accounts</h3>
            </div>
            <span className="text-xs text-slate-400">{users.length} total</span>
          </div>

          <div className="mt-6 space-y-3">
            {derived.recentUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-borderGlow/60 bg-base/40 px-4 py-10 text-center text-sm text-slate-400">
                No users found.
              </div>
            ) : (
              derived.recentUsers.map((user) => (
                <div key={user._id} className="rounded-2xl border border-borderGlow/50 bg-base/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{user.name || "Unnamed user"}</p>
                      <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleTone[user.role] || roleTone.user}`}>
                      {user.role || "user"}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                    <span>Balance {formatCurrency(user.balance)}</span>
                    <span>{formatDateTime(user.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Recent Transactions</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Latest trading activity</h3>
            </div>
            <span className="text-xs text-slate-400">{transactions.length} loaded</span>
          </div>

          <div className="mt-6 space-y-3">
            {derived.recentTransactions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-borderGlow/60 bg-base/40 px-4 py-10 text-center text-sm text-slate-400">
                No transactions found.
              </div>
            ) : (
              derived.recentTransactions.map((transaction) => (
                <div key={transaction._id} className="rounded-2xl border border-borderGlow/50 bg-base/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-white">{transaction.symbol}</p>
                      <p className="mt-1 text-xs text-slate-400">{transaction.companyName || "Company unavailable"}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeTone[transaction.type] || "border-borderGlow/60 bg-base/70 text-slate-300"}`}>
                      {transaction.type || "-"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400 sm:grid-cols-4">
                    <span>Qty {formatNumber(transaction.quantity)}</span>
                    <span>Price {formatCurrency(transaction.price)}</span>
                    <span>Total {formatCurrency(transaction.total)}</span>
                    <span>{formatDateTime(transaction.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>

      <GlassPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Admin Monitor</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Users and transactions</h3>
          </div>
          <div className="flex rounded-full border border-borderGlow/60 bg-base/70 p-1">
            {[
              { id: "users", label: "Users" },
              { id: "transactions", label: "Transactions" },
              { id: "orders", label: "Orders" }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  tab === item.id ? "bg-cyan text-slate-950" : "text-slate-400 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-borderGlow/60">
          {tab === "users" ? (
            <div className="divide-y divide-borderGlow/50">
              {users.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">No users found.</div>
              ) : (
                users.map((user) => (
                  <div key={user._id} className="grid gap-3 px-4 py-4 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-3">
                      <p className="font-semibold text-white">{user.name || "Unnamed user"}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleTone[user.role] || roleTone.user}`}>
                        {user.role || "user"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 md:col-span-3">{formatCurrency(user.balance)}</p>
                    <p className="text-sm text-slate-400 md:col-span-4 md:text-right">{formatDateTime(user.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {tab === "transactions" ? (
            <div className="divide-y divide-borderGlow/50">
              {transactions.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">No transactions found.</div>
              ) : (
                transactions.map((transaction) => (
                  <div key={transaction._id} className="grid gap-3 px-4 py-4 md:grid-cols-12 md:items-center">
                    <div className="md:col-span-3">
                      <p className="font-mono text-sm font-semibold text-white">{transaction.symbol}</p>
                      <p className="line-clamp-1 text-xs text-slate-400">{transaction.companyName || "Company unavailable"}</p>
                    </div>
                    <div className="md:col-span-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeTone[transaction.type] || "border-borderGlow/60 bg-base/70 text-slate-300"}`}>
                        {transaction.type || "-"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 md:col-span-2">Qty {formatNumber(transaction.quantity)}</p>
                    <p className="text-sm text-slate-300 md:col-span-2">{formatCurrency(transaction.total)}</p>
                    <p className="text-sm text-slate-400 md:col-span-3 md:text-right">{formatDateTime(transaction.timestamp)}</p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {tab === "orders" ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              Recent orders and total order count need an admin orders API. Current backend exposes admin users,
              transactions, and stats only.
            </div>
          ) : null}
        </div>
      </GlassPanel>
    </div>
  );
};

export default Admin;
