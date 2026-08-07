import { useEffect, useMemo, useState } from "react";
import { Archive, CircleAlert, RefreshCcw, Search } from "lucide-react";
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
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value))
    ? money.format(Number(value))
    : "-";

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
  BUY: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  SELL: "border-red-500/30 bg-red-500/10 text-red-400"
};

const roleTone = {
  admin: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  user: "border-borderGlow bg-slate-800/70 text-slate-300"
};

const statusTone = {
  Pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Triggered: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Executed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  Cancelled: "border-borderGlow bg-slate-800/60 text-slate-400",
  Rejected: "border-red-500/30 bg-red-500/10 text-red-400"
};

const orderStatuses = ["Pending", "Triggered", "Executed", "Cancelled", "Rejected"];

const StatCard = ({ label, value, detail }) => (
  <GlassPanel className="min-h-[120px] border-l-4 border-l-cyan/70">
    <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
    <p className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">{value}</p>
    {detail ? <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p> : null}
  </GlassPanel>
);

const LoadingState = () => (
  <div className="flex flex-col gap-6">
    <PageHeader title="Admin Control" subtitle="Loading platform operations." />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <GlassPanel key={index} className="min-h-[120px]">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-8 w-2/3" />
          <Skeleton className="mt-3 h-3 w-1/2" />
        </GlassPanel>
      ))}
    </div>
    <GlassPanel>
      <Skeleton className="h-[320px] w-full rounded-lg" />
    </GlassPanel>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col gap-6">
    <PageHeader title="Admin Control" subtitle="Monitor users, trading activity, and platform stats." />
    <GlassPanel className="border-red-500/30 bg-red-500/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-red-200">
            <CircleAlert className="h-5 w-5" aria-hidden="true" />
            <h3 className="text-sm font-semibold uppercase">Admin data unavailable</h3>
          </div>
          <p className="mt-3 text-sm text-red-100/90">{error}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/30"
        >
          <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          Retry
        </button>
      </div>
    </GlassPanel>
  </div>
);

const SectionNotice = ({ warnings }) =>
  warnings.length > 0 ? (
    <GlassPanel className="border-amber-500/30 bg-amber-500/10 text-sm text-amber-100">
      {warnings.join(" ")}
    </GlassPanel>
  ) : null;

const EmptyState = ({ children }) => (
  <div className="rounded-lg border border-dashed border-borderGlow bg-base px-4 py-10 text-center text-sm text-slate-400">
    {children}
  </div>
);

const Badge = ({ children, className }) => (
  <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const TableShell = ({ children }) => (
  <div className="overflow-x-auto rounded-lg border border-borderGlow">
    <div className="min-w-[1120px] divide-y divide-borderGlow">{children}</div>
  </div>
);

const Admin = ({ view = "dashboard" }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [dataWarnings, setDataWarnings] = useState([]);
  const [userQuery, setUserQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("All");
  const [competitionForm, setCompetitionForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    startingBalance: "1000000",
    status: "upcoming"
  });
  const [competitionSaving, setCompetitionSaving] = useState(false);
  const [competitionError, setCompetitionError] = useState("");

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError("");
      setDataWarnings([]);
      const requests = await Promise.allSettled([
        api.get("/api/admin/stats"),
        api.get("/api/admin/users"),
        api.get("/api/admin/transactions"),
        api.get("/api/admin/orders"),
        api.get("/api/admin/competitions")
      ]);
      const [statsRes, usersRes, transactionsRes, ordersRes, competitionsRes] = requests;
      const warnings = [];

      if (statsRes.status === "fulfilled") setStats(statsRes.value.data || null);
      else warnings.push("Statistics failed to load.");
      if (usersRes.status === "fulfilled") setUsers(Array.isArray(usersRes.value.data) ? usersRes.value.data : []);
      else warnings.push("Users failed to load.");
      if (transactionsRes.status === "fulfilled") setTransactions(Array.isArray(transactionsRes.value.data) ? transactionsRes.value.data : []);
      else warnings.push("Transactions failed to load.");
      if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value.data) ? ordersRes.value.data : []);
      else warnings.push("Orders failed to load.");
      if (competitionsRes.status === "fulfilled") setCompetitions(Array.isArray(competitionsRes.value.data) ? competitionsRes.value.data : []);
      else warnings.push("Competitions failed to load.");

      setDataWarnings(warnings);
      if (requests.every((request) => request.status === "rejected")) {
        throw requests[0].reason;
      }
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
    const totalVolume = transactions.reduce((sum, transaction) => sum + (Number(transaction.total) || 0), 0);
    const buyCount = transactions.filter((transaction) => transaction.type === "BUY").length;
    const sellCount = transactions.filter((transaction) => transaction.type === "SELL").length;
    const orderCounts = orders.reduce((acc, order) => {
      acc[order.status || "Unknown"] = (acc[order.status || "Unknown"] || 0) + 1;
      return acc;
    }, {});

    return {
      totalVolume,
      buyCount,
      sellCount,
      orderCounts,
      recentUsers: [...users].sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 5),
      recentTransactions: transactions.slice(0, 5),
      recentOrders: orders.slice(0, 5)
    };
  }, [orders, transactions, users]);

  const filteredUsers = useMemo(() => {
    const query = userQuery.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => `${user.name || ""} ${user.email || ""} ${user.role || ""}`.toLowerCase().includes(query));
  }, [userQuery, users]);

  const filteredOrders = useMemo(() => {
    if (orderStatus === "All") return orders;
    return orders.filter((order) => order.status === orderStatus);
  }, [orderStatus, orders]);

  const createCompetition = async (event) => {
    event.preventDefault();
    try {
      setCompetitionSaving(true);
      setCompetitionError("");
      await api.post("/api/admin/competitions", {
        ...competitionForm,
        startingBalance: Number(competitionForm.startingBalance)
      });
      setCompetitionForm({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        startingBalance: "1000000",
        status: "upcoming"
      });
      await loadAdminData();
    } catch (err) {
      setCompetitionError(getApiErrorMessage(err, "Failed to create competition"));
    } finally {
      setCompetitionSaving(false);
    }
  };

  const archiveCompetition = async (id) => {
    try {
      setCompetitionError("");
      await api.patch(`/api/admin/competitions/${id}/archive`);
      await loadAdminData();
    } catch (err) {
      setCompetitionError(getApiErrorMessage(err, "Failed to archive competition"));
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={loadAdminData} />;

  const statsCards = (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total Users" value={formatNumber(stats?.totalUsers ?? users.length)} detail="Registered accounts" />
      <StatCard label="Total Orders" value={formatNumber(stats?.totalOrders ?? orders.length)} detail="Executed, rejected, pending, and cancelled" />
      <StatCard
        label="Total Transactions"
        value={formatNumber(stats?.totalTransactions ?? transactions.length)}
        detail={`${formatNumber(stats?.buyCount ?? derived.buyCount)} buys / ${formatNumber(stats?.sellCount ?? derived.sellCount)} sells`}
      />
      <StatCard label="Trading Volume" value={formatCurrency(stats?.tradingVolume ?? derived.totalVolume)} detail="Executed transaction turnover" />
    </div>
  );

  if (view === "users") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Users" subtitle="Review registered accounts, roles, balances, and join dates." />
        <SectionNotice warnings={dataWarnings} />
        <GlassPanel>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">User Management</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{formatNumber(users.length)} accounts</h3>
            </div>
            <label className="relative w-full md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
                placeholder="Search users"
                className="w-full rounded-lg border border-borderGlow bg-base py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/20"
              />
            </label>
          </div>

          <div className="mt-6">
            {filteredUsers.length === 0 ? (
              <EmptyState>No users found.</EmptyState>
            ) : (
              <TableShell>
                <div className="grid grid-cols-12 bg-slate-900/50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                  <span className="col-span-4">User</span>
                  <span className="col-span-2">Role</span>
                  <span className="col-span-3 text-right">Balance</span>
                  <span className="col-span-3 text-right">Created</span>
                </div>
                {filteredUsers.map((user) => (
                  <div key={user._id} className="grid grid-cols-12 items-center gap-3 bg-panel px-4 py-4">
                    <div className="col-span-4 min-w-0">
                      <p className="truncate font-semibold text-white">{user.name || "Unnamed user"}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge className={roleTone[user.role] || roleTone.user}>{user.role || "user"}</Badge>
                    </div>
                    <p className="col-span-3 text-right font-mono text-sm text-slate-300">{formatCurrency(user.balance)}</p>
                    <p className="col-span-3 text-right text-sm text-slate-400">{formatDateTime(user.createdAt)}</p>
                  </div>
                ))}
              </TableShell>
            )}
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (view === "transactions") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Transactions" subtitle="Executed buy and sell transactions only." />
        <SectionNotice warnings={dataWarnings} />
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Transactions" value={formatNumber(transactions.length)} detail="Executed records" />
          <StatCard label="Buy / Sell" value={`${formatNumber(derived.buyCount)} / ${formatNumber(derived.sellCount)}`} detail="Classification" />
          <StatCard label="Turnover" value={formatCurrency(derived.totalVolume)} detail="Total transaction value" />
        </div>
        <GlassPanel>
          {transactions.length === 0 ? (
            <EmptyState>No transactions found.</EmptyState>
          ) : (
            <TableShell>
              <div className="grid grid-cols-12 bg-slate-900/50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                <span className="col-span-3">Instrument</span>
                <span className="col-span-2">Type</span>
                <span className="col-span-2 text-right">Quantity</span>
                <span className="col-span-2 text-right">Total</span>
                <span className="col-span-3 text-right">Time</span>
              </div>
              {transactions.map((transaction) => (
                <div key={transaction._id} className="grid grid-cols-12 items-center gap-3 bg-panel px-4 py-4">
                  <div className="col-span-3 min-w-0">
                    <p className="truncate font-mono text-sm font-semibold text-white">{transaction.symbol}</p>
                    <p className="truncate text-xs text-slate-400">{transaction.companyName || "Company unavailable"}</p>
                  </div>
                  <div className="col-span-2">
                    <Badge className={typeTone[transaction.type] || "border-borderGlow bg-base text-slate-300"}>{transaction.type || "-"}</Badge>
                  </div>
                  <p className="col-span-2 text-right font-mono text-sm text-slate-300">{formatNumber(transaction.quantity)}</p>
                  <p className="col-span-2 text-right font-mono text-sm text-slate-300">{formatCurrency(transaction.total)}</p>
                  <p className="col-span-3 text-right text-sm text-slate-400">{formatDateTime(transaction.timestamp)}</p>
                </div>
              ))}
            </TableShell>
          )}
        </GlassPanel>
      </div>
    );
  }

  if (view === "orders") {
    const orderStatusSummary = stats?.orderStatuses || derived.orderCounts;

    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Orders" subtitle="Review pending, triggered, executed, cancelled, and rejected order flow." />
        <SectionNotice warnings={dataWarnings} />
        <div className="grid gap-4 md:grid-cols-4">
          {orderStatuses.map((status) => (
            <StatCard key={status} label={status} value={formatNumber(orderStatusSummary?.[status] || 0)} detail="Orders" />
          ))}
        </div>
        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Order Records</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{formatNumber(filteredOrders.length)} shown</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {["All", ...orderStatuses].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setOrderStatus(status)}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20 ${
                    orderStatus === status
                      ? "border-cyan/40 bg-cyan/10 text-cyan"
                      : "border-borderGlow bg-base text-slate-400 hover:border-cyan/30 hover:text-white"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            {filteredOrders.length === 0 ? (
              <EmptyState>No orders found.</EmptyState>
            ) : (
              <TableShell>
                <div className="grid grid-cols-12 bg-slate-900/50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                  <span className="col-span-2">Symbol</span>
                  <span className="col-span-1">Side</span>
                  <span className="col-span-1 text-right">Qty</span>
                  <span className="col-span-2 text-right">Prices</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-2 text-right">Timeline</span>
                  <span className="col-span-2 text-right">User</span>
                </div>
                {filteredOrders.map((order) => (
                  <div key={order._id || order.id} className="grid grid-cols-12 items-center gap-3 bg-panel px-4 py-4">
                    <div className="col-span-2 min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-white">{order.symbol}</p>
                      <p className="truncate text-xs text-slate-400">{order.companyName || order.orderType || "-"}</p>
                    </div>
                    <div className="col-span-1">
                      <Badge className={typeTone[order.side] || "border-borderGlow bg-base text-slate-300"}>{order.side || "-"}</Badge>
                    </div>
                    <p className="col-span-1 text-right font-mono text-sm text-slate-300">{formatNumber(order.quantity)}</p>
                    <div className="col-span-2 text-right font-mono text-xs leading-5 text-slate-400">
                      <p className="text-sm text-slate-300">{formatCurrency(order.price)}</p>
                      <p>L {formatCurrency(order.limitPrice)} / T {formatCurrency(order.triggerPrice)}</p>
                      <p>Exec {formatCurrency(order.executionPrice)}</p>
                    </div>
                    <div className="col-span-2">
                      <Badge className={statusTone[order.status] || statusTone.Pending}>{order.status || "-"}</Badge>
                      {order.rejectionReason || order.cancellationReason ? (
                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
                          {order.rejectionReason || order.cancellationReason}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-span-2 text-right text-xs leading-5 text-slate-400">
                      <p>Submitted {formatDateTime(order.submittedAt || order.createdAt)}</p>
                      {order.stopTriggeredAt ? <p>Triggered {formatDateTime(order.stopTriggeredAt)}</p> : null}
                      {order.executedAt ? <p>Executed {formatDateTime(order.executedAt)}</p> : null}
                      {order.cancelledAt ? <p>Cancelled {formatDateTime(order.cancelledAt)}</p> : null}
                    </div>
                    <div className="col-span-2 min-w-0 text-right">
                      <p className="truncate text-sm text-slate-300">{order.userName || order.user?.name || "Unknown user"}</p>
                      <p className="truncate text-xs text-slate-400">{order.userEmail || order.user?.email || ""}</p>
                    </div>
                  </div>
                ))}
              </TableShell>
            )}
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (view === "competitions") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Competitions" subtitle="Create, review, and archive trading competitions." />
        <SectionNotice warnings={dataWarnings} />
        <GlassPanel>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Create Competition</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Competition setup</h3>
          </div>
          <form className="mt-5 grid gap-4 xl:grid-cols-6" onSubmit={createCompetition}>
            <div className="xl:col-span-2">
              <label className="text-xs font-semibold uppercase text-slate-500">Title</label>
              <input
                value={competitionForm.name}
                onChange={(event) => setCompetitionForm((form) => ({ ...form, name: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                disabled={competitionSaving}
                required
              />
            </div>
            <div className="xl:col-span-4">
              <label className="text-xs font-semibold uppercase text-slate-500">Description</label>
              <input
                value={competitionForm.description}
                onChange={(event) => setCompetitionForm((form) => ({ ...form, description: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                disabled={competitionSaving}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Start</label>
              <input
                type="date"
                value={competitionForm.startDate}
                onChange={(event) => setCompetitionForm((form) => ({ ...form, startDate: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                disabled={competitionSaving}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">End</label>
              <input
                type="date"
                value={competitionForm.endDate}
                onChange={(event) => setCompetitionForm((form) => ({ ...form, endDate: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                disabled={competitionSaving}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Starting Balance</label>
              <input
                type="number"
                min="1"
                value={competitionForm.startingBalance}
                onChange={(event) => setCompetitionForm((form) => ({ ...form, startingBalance: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                disabled={competitionSaving}
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Status</label>
              <select
                value={competitionForm.status}
                onChange={(event) => setCompetitionForm((form) => ({ ...form, status: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-borderGlow bg-base px-3 py-3 text-sm text-white outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                disabled={competitionSaving}
              >
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={competitionSaving}
                className="min-h-11 w-full rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-base transition hover:bg-cyan/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {competitionSaving ? "Creating..." : "Create"}
              </button>
            </div>
            {competitionError ? <p className="xl:col-span-6 text-sm text-red-300">{competitionError}</p> : null}
          </form>
        </GlassPanel>

        <GlassPanel>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Competition Records</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{formatNumber(competitions.length)} competitions</h3>
          </div>
          <div className="mt-6">
            {competitions.length === 0 ? (
              <EmptyState>No competitions found.</EmptyState>
            ) : (
              <TableShell>
                <div className="grid grid-cols-12 bg-slate-900/50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                  <span className="col-span-4">Competition</span>
                  <span className="col-span-2">Status</span>
                  <span className="col-span-2 text-right">Starting Balance</span>
                  <span className="col-span-2 text-right">Participants</span>
                  <span className="col-span-2 text-right">Action</span>
                </div>
                {competitions.map((competition) => (
                  <div key={competition._id} className="grid grid-cols-12 items-center gap-3 bg-panel px-4 py-4">
                    <div className="col-span-4 min-w-0">
                      <p className="truncate font-semibold text-white">{competition.name}</p>
                      <p className="truncate text-xs text-slate-400">{competition.description || "No description"}</p>
                    </div>
                    <p className="col-span-2 text-sm capitalize text-slate-300">{competition.status}</p>
                    <p className="col-span-2 text-right font-mono text-sm text-slate-300">{formatCurrency(competition.startingBalance)}</p>
                    <p className="col-span-2 text-right text-sm text-slate-400">{formatNumber(competition.participantCount)}</p>
                    <div className="col-span-2 text-right">
                      {competition.archived ? (
                        <Badge className="border-slate-600 bg-slate-800 text-slate-300">Archived</Badge>
                      ) : (
                        <button
                          type="button"
                          onClick={() => archiveCompetition(competition._id)}
                          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-borderGlow bg-base px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-red-500/40 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/20"
                        >
                          <Archive className="h-4 w-4" aria-hidden="true" />
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </TableShell>
            )}
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin Dashboard" subtitle="Summary metrics and recent platform activity." />
      <SectionNotice warnings={dataWarnings} />
      {statsCards}

      <div className="grid gap-6 xl:grid-cols-3">
        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Recent Users</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Newest accounts</h3>
            </div>
            <span className="text-xs text-slate-400">{formatNumber(users.length)} total</span>
          </div>
          <div className="mt-6 space-y-3">
            {derived.recentUsers.length === 0 ? (
              <EmptyState>No users found.</EmptyState>
            ) : (
              derived.recentUsers.map((user) => (
                <div key={user._id} className="rounded-lg border border-borderGlow bg-base p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{user.name || "Unnamed user"}</p>
                      <p className="truncate text-xs text-slate-400">{user.email}</p>
                    </div>
                    <Badge className={roleTone[user.role] || roleTone.user}>{user.role || "user"}</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{formatDateTime(user.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Recent Transactions</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Latest executions</h3>
            </div>
            <span className="text-xs text-slate-400">{formatNumber(transactions.length)} loaded</span>
          </div>
          <div className="mt-6 space-y-3">
            {derived.recentTransactions.length === 0 ? (
              <EmptyState>No transactions found.</EmptyState>
            ) : (
              derived.recentTransactions.map((transaction) => (
                <div key={transaction._id} className="rounded-lg border border-borderGlow bg-base p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-white">{transaction.symbol}</p>
                      <p className="truncate text-xs text-slate-400">{transaction.companyName || "Company unavailable"}</p>
                    </div>
                    <Badge className={typeTone[transaction.type] || "border-borderGlow bg-base text-slate-300"}>{transaction.type || "-"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{formatCurrency(transaction.total)}</span>
                    <span>{formatDateTime(transaction.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Recent Orders</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Order flow</h3>
            </div>
            <span className="text-xs text-slate-400">{formatNumber(orders.length)} loaded</span>
          </div>
          <div className="mt-6 space-y-3">
            {derived.recentOrders.length === 0 ? (
              <EmptyState>No orders found.</EmptyState>
            ) : (
              derived.recentOrders.map((order) => (
                <div key={order._id || order.id} className="rounded-lg border border-borderGlow bg-base p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-white">{order.symbol}</p>
                      <p className="truncate text-xs text-slate-400">{order.userEmail || order.user?.email || "Unknown user"}</p>
                    </div>
                    <Badge className={statusTone[order.status] || statusTone.Pending}>{order.status || "-"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{order.side || "-"} / {order.orderType || "-"}</span>
                    <span>{formatDateTime(order.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

export default Admin;
