import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  BadgeIndianRupee,
  CircleAlert,
  LineChart,
  PieChart,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
  Wallet
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart
} from "recharts";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import useLivePrices from "../hooks/useLivePrices";
import useToast from "../hooks/useToast";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

const STARTING_CAPITAL = 1000000;
const chartColors = ["#38BDF8", "#64748B", "#22C55E", "#EF4444", "#94A3B8", "#2563EB", "#475569", "#0EA5E9"];

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(number);
};

const formatCompactCurrency = (value) => {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 2
  }).format(number);
};

const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
};

const toDayKey = (value) => new Date(value).toISOString().slice(0, 10);

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const standardDeviation = (values) => {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const buildEquitySeries = (transactions) => {
  const sortedTransactions = [...transactions].sort(
    (left, right) => new Date(left.timestamp) - new Date(right.timestamp)
  );

  if (sortedTransactions.length === 0) return [];

  const firstDay = startOfDay(sortedTransactions[0].timestamp);
  const today = startOfDay(new Date());
  const groupedByDay = new Map();

  sortedTransactions.forEach((transaction) => {
    const dayKey = toDayKey(transaction.timestamp);
    if (!groupedByDay.has(dayKey)) {
      groupedByDay.set(dayKey, []);
    }
    groupedByDay.get(dayKey).push(transaction);
  });

  const positions = new Map();
  let cash = STARTING_CAPITAL;
  const series = [];

  for (let cursor = firstDay; cursor <= today; cursor = addDays(cursor, 1)) {
    const dayKey = toDayKey(cursor);
    const transactionsForDay = groupedByDay.get(dayKey) || [];

    transactionsForDay.forEach((transaction) => {
      const symbol = transaction.symbol;
      const quantity = Number(transaction.quantity) || 0;
      const total = Number(transaction.total) || 0;
      const price = Number(transaction.price) || 0;
      const current = positions.get(symbol) || { quantity: 0, lastPrice: price };

      if (transaction.type === "BUY") {
        cash -= total;
        current.quantity += quantity;
      } else {
        cash += total;
        current.quantity -= quantity;
      }

      current.lastPrice = price;

      if (current.quantity <= 0) {
        positions.delete(symbol);
      } else {
        positions.set(symbol, current);
      }
    });

    const holdingsValue = Array.from(positions.values()).reduce(
      (sum, item) => sum + item.quantity * item.lastPrice,
      0
    );
    const equity = cash + holdingsValue;
    series.push({
      date: dayKey,
      equity,
      holdingsValue,
      cash,
      growth: ((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100
    });
  }

  return series.map((point, index) => ({
    ...point,
    dailyReturn:
      index === 0 || series[index - 1].equity === 0
        ? 0
        : ((point.equity - series[index - 1].equity) / series[index - 1].equity) * 100
  }));
};

const LoadingStatCard = () => (
  <GlassPanel className="min-h-[118px]">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="mt-4 h-8 w-2/3" />
    <Skeleton className="mt-3 h-3 w-1/2" />
  </GlassPanel>
);

const LoadingChartPanel = ({ title }) => (
  <GlassPanel className="min-h-[360px]">
    <div className="flex items-center justify-between gap-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-28" />
    </div>
    <Skeleton className="mt-6 h-[270px] w-full" />
    <div className="mt-4 flex gap-3 text-xs text-[#A1A1B5]">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
    <span className="sr-only">{title}</span>
  </GlassPanel>
);

const SectionHeader = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-wrap items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan" />
        <h3 className="text-sm font-semibold uppercase text-[#E7E9F3]">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-[#A1A1B5]">{subtitle}</p>
    </div>
    {action}
  </div>
);

const MetricCard = ({ label, value, detail, icon: Icon, tone = "cyan" }) => {
  const tones = {
    cyan: "border-cyan/30 bg-cyan/10 text-cyan",
    amber: "border-slate-600 bg-[#1A1B2B] text-[#C2C4D2]",
    red: "border-red-500/30 bg-red-500/10 text-red-200",
    slate: "border-white/10 bg-[#121320] text-[#E7E9F3]"
  };

  return (
    <GlassPanel className="min-h-[128px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase text-[#A1A1B5]">{label}</p>
          <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
          <p className={`mt-2 text-xs ${Number(detail?.rawValue) < 0 ? "text-red-400" : "text-[#A1A1B5]"}`}>
            {detail}
          </p>
        </div>
        <span className={`rounded-2xl border p-3 ${tones[tone] || tones.slate}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </GlassPanel>
  );
};

const Portfolio = () => {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const holdingSymbols = useMemo(() => holdings.map((holding) => holding.symbol).filter(Boolean), [holdings]);
  const prices = useLivePrices(holdingSymbols);

  const loadPortfolio = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const [meRes, portfolioRes, analyticsRes, transactionsRes] = await Promise.all([
        api.get("/api/auth/me"),
        api.get("/api/portfolio"),
        api.get("/api/portfolio/analytics"),
        api.get("/api/transactions")
      ]);

      setUser(meRes.data || null);
      setHoldings(Array.isArray(portfolioRes.data) ? portfolioRes.data : []);
      setAnalytics(analyticsRes.data || null);
      setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load portfolio analytics");
      setError(message);
      push(message, "error");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    const refreshSnapshot = () => {
      loadPortfolio({ showLoading: false });
    };

    socket.on("portfolio-update", refreshSnapshot);
    socket.on("position-update", refreshSnapshot);
    socket.on("transaction-update", refreshSnapshot);
    socket.on("order-update", refreshSnapshot);
    socket.on("connect", refreshSnapshot);

    return () => {
      socket.off("portfolio-update", refreshSnapshot);
      socket.off("position-update", refreshSnapshot);
      socket.off("transaction-update", refreshSnapshot);
      socket.off("order-update", refreshSnapshot);
      socket.off("connect", refreshSnapshot);
    };
  }, [loadPortfolio]);

  const liveHoldings = useMemo(() => {
    return holdings.map((holding) => {
      const quote = prices[holding.symbol];
      const livePrice = Number(quote?.price ?? quote?.c);
      const fallbackPrice = Number(holding.currentPrice);
      const hasPrice = Number.isFinite(livePrice) && livePrice > 0
        ? true
        : Number.isFinite(fallbackPrice) && fallbackPrice > 0;
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : hasPrice ? fallbackPrice : null;
      const quantity = Number(holding.quantity) || 0;
      const investedValue = Number(holding.avgBuyPrice || 0) * quantity;
      const currentValue = hasPrice ? currentPrice * quantity : null;
      const pnl = hasPrice ? currentValue - investedValue : null;
      const pnlPct = hasPrice && investedValue > 0 ? (pnl / investedValue) * 100 : null;

      return {
        ...holding,
        currentPrice,
        currentValue,
        totalInvested: investedValue,
        investedValue,
        pnl,
        pnlPct,
        valuationAvailable: hasPrice,
        quoteStale: Boolean(quote?.stale ?? holding.quoteStale),
        quoteStatus: quote?.status || holding.quoteStatus,
        priceUpdatedAt: quote?.fetchedAt || holding.priceUpdatedAt
      };
    });
  }, [holdings, prices]);

  const liveAnalytics = useMemo(() => {
    const invested = liveHoldings.reduce((sum, holding) => sum + (Number(holding.investedValue) || 0), 0);
    const unavailable = liveHoldings.some((holding) => holding.valuationAvailable === false);
    const currentValue = unavailable
      ? null
      : liveHoldings.reduce((sum, holding) => sum + (Number(holding.currentValue) || 0), 0);
    const pnl = currentValue === null ? null : currentValue - invested;
    return {
      ...(analytics || {}),
      invested,
      currentValue,
      pnl,
      pnlPct: Number.isFinite(Number(pnl)) && invested > 0 ? (pnl / invested) * 100 : null,
      valuationAvailable: !unavailable
    };
  }, [analytics, liveHoldings]);

  const derived = useMemo(() => {
    const holdingRows = [...liveHoldings].sort((left, right) => (Number(right.currentValue) || 0) - (Number(left.currentValue) || 0));
    const allocationRows = holdingRows
      .filter((item) => Number(item.currentValue) > 0)
      .map((item, index) => ({
        symbol: item.symbol,
        name: item.companyName,
        value: Number(item.currentValue) || 0,
        percent: liveAnalytics?.currentValue ? ((Number(item.currentValue) || 0) / liveAnalytics.currentValue) * 100 : 0,
        color: chartColors[index % chartColors.length]
      }));

    const equitySeries = buildEquitySeries(transactions);
    const growthSeries = equitySeries.map((point) => ({
      date: point.date,
      growth: point.growth,
      equity: point.equity
    }));
    const dailyReturns = equitySeries.map((point) => ({
      date: point.date,
      return: point.dailyReturn
    }));

    const latestPoint = equitySeries[equitySeries.length - 1];
    const previousPoint = equitySeries[equitySeries.length - 2];
    const dailyProfitLoss = latestPoint && previousPoint ? latestPoint.equity - previousPoint.equity : 0;
    const dailyProfitLossPct = previousPoint?.equity
      ? (dailyProfitLoss / previousPoint.equity) * 100
      : 0;

    const returnsValues = dailyReturns.slice(1).map((item) => item.return / 100);
    const volatility = returnsValues.length ? standardDeviation(returnsValues) * Math.sqrt(252) * 100 : 0;

    const bestHolding = [...holdingRows].sort((left, right) => (right.pnlPct || 0) - (left.pnlPct || 0))[0] || null;
    const worstHolding = [...holdingRows].sort((left, right) => (left.pnlPct || 0) - (right.pnlPct || 0))[0] || null;
    const largestPosition = [...holdingRows].sort((left, right) => (Number(right.currentValue) || 0) - (Number(left.currentValue) || 0))[0] || null;

    return {
      holdingRows,
      allocationRows,
      equitySeries,
      growthSeries,
      dailyReturns,
      dailyProfitLoss,
      dailyProfitLossPct,
      volatility,
      bestHolding,
      worstHolding,
      largestPosition,
      totalPortfolioValue: (Number(user?.balance) || 0) + (Number(liveAnalytics?.currentValue) || 0),
      investedAmount: Number(liveAnalytics?.invested) || 0,
      availableCash: Number(user?.balance) || 0,
      totalProfitLoss: ((Number(user?.balance) || 0) + (Number(liveAnalytics?.currentValue) || 0)) - STARTING_CAPITAL,
      totalProfitLossPct:
        STARTING_CAPITAL > 0
          ? ((((Number(user?.balance) || 0) + (Number(liveAnalytics?.currentValue) || 0)) - STARTING_CAPITAL) / STARTING_CAPITAL) * 100
          : 0
    };
  }, [liveAnalytics, liveHoldings, transactions, user]);

  const hasHoldings = derived.holdingRows.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Portfolio" subtitle="Track holdings, performance, and sector allocation in real time." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <LoadingStatCard key={`stat-${index}`} />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <LoadingChartPanel title="Portfolio analytics" />
          <LoadingChartPanel title="Allocation" />
        </div>
        <LoadingChartPanel title="Holdings table" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Portfolio"
          subtitle="Track holdings, performance, and sector allocation in real time."
        />
        <GlassPanel className="border border-red-500/30 bg-red-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-200">
                <CircleAlert className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase">Portfolio unavailable</h3>
              </div>
              <p className="mt-3 max-w-2xl text-sm text-red-100/90">
                {error}
              </p>
            </div>
            <button
              type="button"
              onClick={loadPortfolio}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!hasHoldings) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Portfolio"
          subtitle="Track holdings, performance, and sector allocation in real time."
        />
        <GlassPanel className="overflow-hidden border border-white/10 bg-[#121320] p-0">
          <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 md:p-8">
              <div className="flex h-full flex-col justify-between gap-8">
                <div>
                  <p className="text-xs font-medium text-[#A1A1B5]">Portfolio setup</p>
                  <h3 className="mt-4 text-3xl font-semibold text-white md:text-4xl">
                    Your portfolio is ready for its first position.
                  </h3>
                  <p className="mt-4 max-w-xl text-sm leading-6 text-[#C2C4D2]">
                    Start trading to unlock allocation charts, growth analytics, and live risk metrics. The dashboard will automatically populate as soon as you place your first buy order.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[#C2C4D2]">
                  <span className="rounded-2xl border border-white/10 bg-[#080910] px-3 py-2">Equity Curve</span>
                  <span className="rounded-2xl border border-white/10 bg-[#080910] px-3 py-2">Allocation</span>
                  <span className="rounded-2xl border border-white/10 bg-[#080910] px-3 py-2">Volatility</span>
                </div>
                <Link
                  to="/"
                  className="inline-flex w-fit items-center gap-2 rounded-2xl border border-cyan/40 bg-cyan/10 px-5 py-3 text-sm font-semibold text-cyan transition hover:bg-cyan/20"
                >
                  Start Trading
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="border-t border-white/10 p-6 md:p-8 lg:border-l lg:border-t-0">
              <div className="grid gap-4">
                <MetricCard
                  label="Total Portfolio Value"
                  value={formatCurrency(STARTING_CAPITAL)}
                  detail="No holdings yet"
                  icon={BadgeIndianRupee}
                  tone="cyan"
                />
                <MetricCard
                  label="Available Cash"
                  value={formatCurrency(user?.balance || STARTING_CAPITAL)}
                  detail="Ready to deploy"
                  icon={Wallet}
                  tone="amber"
                />
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Portfolio"
          subtitle="Professional portfolio analytics with summary, allocation, growth, and risk insights."
        />
        <button
          type="button"
          onClick={loadPortfolio}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#121320] px-4 py-3 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Total Portfolio Value"
          value={formatCurrency(derived.totalPortfolioValue)}
          detail={formatPercent(derived.totalProfitLossPct)}
          icon={BadgeIndianRupee}
          tone={derived.totalProfitLoss >= 0 ? "cyan" : "red"}
        />
        <MetricCard
          label="Invested Amount"
          value={formatCurrency(derived.investedAmount)}
          detail={`${derived.holdingRows.length} holdings invested`}
          icon={Wallet}
          tone="amber"
        />
        <MetricCard
          label="Available Cash"
          value={formatCurrency(derived.availableCash)}
          detail="Unallocated buying power"
          icon={ShieldAlert}
          tone="slate"
        />
        <MetricCard
          label="Total Profit / Loss"
          value={formatCurrency(derived.totalProfitLoss)}
          detail={formatPercent(derived.totalProfitLossPct)}
          icon={TrendingUp}
          tone={derived.totalProfitLoss >= 0 ? "cyan" : "red"}
        />
        <MetricCard
          label="Daily Profit / Loss"
          value={formatCurrency(derived.dailyProfitLoss)}
          detail={formatPercent(derived.dailyProfitLossPct)}
          icon={LineChart}
          tone={derived.dailyProfitLoss >= 0 ? "cyan" : "red"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <GlassPanel className="flex min-h-[420px] flex-col gap-6">
          <SectionHeader
            icon={PieChart}
            title="Asset Allocation"
            subtitle="Allocation by stock with live percentage of current market value."
          />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={derived.allocationRows}
                    dataKey="value"
                    nameKey="symbol"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={3}
                  >
                    {derived.allocationRows.map((entry, index) => (
                      <Cell key={entry.symbol} fill={entry.color || chartColors[index % chartColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name, props) => [formatCurrency(value), `${props.payload.symbol} Allocation`]}
                    contentStyle={{
                      background: "rgba(7, 11, 20, 0.96)",
                      border: "1px solid rgba(148, 163, 184, 0.2)",
                      borderRadius: 16
                    }}
                  />
                  <Legend />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3">
              {derived.allocationRows.map((item, index) => (
                <div key={item.symbol} className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color || chartColors[index % chartColors.length] }} />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.symbol}</p>
                        <p className="text-xs text-[#A1A1B5]">{item.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatPercent(item.percent)}</p>
                      <p className="text-xs text-[#A1A1B5]">{formatCurrency(item.value)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel className="flex min-h-[420px] flex-col gap-6">
          <SectionHeader
            icon={BarChart3}
            title="Risk Metrics"
            subtitle="Volatility and leadership across the current book."
          />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
              <p className="text-[11px] uppercase text-[#A1A1B5]">Portfolio Volatility</p>
              <p className="mt-3 text-2xl font-semibold text-white">{formatPercent(derived.volatility)}</p>
              <p className="mt-2 text-xs text-[#A1A1B5]">Annualized from daily returns</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
              <p className="text-[11px] uppercase text-[#A1A1B5]">Largest Position</p>
              <p className="mt-3 text-2xl font-semibold text-white">{derived.largestPosition?.symbol || "—"}</p>
              <p className="mt-2 text-xs text-[#A1A1B5]">
                {derived.largestPosition ? formatCurrency(derived.largestPosition.currentValue) : "No holdings"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
              <p className="text-[11px] uppercase text-[#A1A1B5]">Best Performing Stock</p>
              <p className="mt-3 text-2xl font-semibold text-white">{derived.bestHolding?.symbol || "—"}</p>
              <p className="mt-2 text-xs text-emerald-400">
                {derived.bestHolding ? formatPercent(derived.bestHolding.pnlPct) : "No holdings"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
              <p className="text-[11px] uppercase text-[#A1A1B5]">Worst Performing Stock</p>
              <p className="mt-3 text-2xl font-semibold text-white">{derived.worstHolding?.symbol || "—"}</p>
              <p className="mt-2 text-xs text-red-200">
                {derived.worstHolding ? formatPercent(derived.worstHolding.pnlPct) : "No holdings"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
            <p className="text-[11px] uppercase text-[#A1A1B5]">Performance Snapshot</p>
            <div className="mt-4 grid gap-3 text-sm text-[#C2C4D2]">
              <div className="flex items-center justify-between">
                <span>Invested Capital</span>
                <span className="font-semibold text-white">{formatCurrency(derived.investedAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Realized + Unrealized P/L</span>
                <span className={`font-semibold ${derived.totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatCurrency(derived.totalProfitLoss)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Return on Equity</span>
                <span className={`font-semibold ${derived.totalProfitLoss >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {formatPercent(derived.totalProfitLossPct)}
                </span>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassPanel className="min-h-[420px]">
          <SectionHeader
            icon={LineChart}
            title="Equity Curve"
            subtitle="Portfolio value over time using transaction history and carried market marks."
          />
          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={derived.equitySeries}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => formatCompactCurrency(value)} width={70} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(label) => `Date ${label}`}
                  contentStyle={{
                    background: "rgba(7, 11, 20, 0.96)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 8
                  }}
                />
                <Area type="monotone" dataKey="equity" stroke="#38BDF8" fill="rgba(56, 189, 248, 0.14)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[420px]">
          <SectionHeader
            icon={TrendingUp}
            title="Portfolio Growth Chart"
            subtitle="Growth from starting capital in percentage terms."
          />
          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={derived.growthSeries}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => `${value.toFixed(0)}%`} width={60} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, "Growth"]}
                  labelFormatter={(label) => `Date ${label}`}
                  contentStyle={{
                    background: "rgba(7, 11, 20, 0.96)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 8
                  }}
                />
                <Line type="monotone" dataKey="growth" stroke="#38BDF8" strokeWidth={2.5} dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <GlassPanel className="min-h-[380px]">
          <SectionHeader
            icon={BarChart3}
            title="Daily Returns Chart"
            subtitle="Day-over-day portfolio returns in percentage terms."
          />
          <div className="mt-6 h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={derived.dailyReturns}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => `${value.toFixed(0)}%`} width={60} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, "Daily Return"]}
                  labelFormatter={(label) => `Date ${label}`}
                  contentStyle={{
                    background: "rgba(7, 11, 20, 0.96)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 8
                  }}
                />
                <Bar dataKey="return" radius={[6, 6, 0, 0]}>
                  {derived.dailyReturns.map((entry, index) => (
                    <Cell key={`cell-${entry.date}`} fill={index === 0 || entry.return >= 0 ? "#22C55E" : "#EF4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>

        <GlassPanel className="min-h-[380px]">
          <SectionHeader
            icon={ArrowUpRight}
            title="Daily Return Trend"
            subtitle="Same data, shown as a quick trend line for movement context."
          />
          <div className="mt-6 h-[270px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={derived.dailyReturns}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} tickFormatter={(value) => `${value.toFixed(0)}%`} width={60} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, "Daily Return"]}
                  labelFormatter={(label) => `Date ${label}`}
                  contentStyle={{
                    background: "rgba(7, 11, 20, 0.96)",
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: 8
                  }}
                />
                <Line type="monotone" dataKey="return" stroke="#38BDF8" strokeWidth={2.5} dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </GlassPanel>
      </div>

      <GlassPanel className="overflow-hidden">
        <SectionHeader
          icon={Wallet}
          title="Holdings Table"
          subtitle="Expanded position-level view with cost basis, live value, and profit analytics."
          action={
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan/30 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/20"
            >
              Start Trading
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          }
        />

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[960px] w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr className="text-[11px] uppercase text-[#A1A1B5]">
                <th className="border-b border-white/10 px-4 py-3">Symbol</th>
                <th className="border-b border-white/10 px-4 py-3">Quantity</th>
                <th className="border-b border-white/10 px-4 py-3">Avg Buy Price</th>
                <th className="border-b border-white/10 px-4 py-3">Current Price</th>
                <th className="border-b border-white/10 px-4 py-3">Invested Value</th>
                <th className="border-b border-white/10 px-4 py-3">Current Value</th>
                <th className="border-b border-white/10 px-4 py-3">Profit / Loss</th>
                <th className="border-b border-white/10 px-4 py-3">Profit / Loss %</th>
              </tr>
            </thead>
            <tbody>
              {derived.holdingRows.map((holding) => (
                <tr key={holding.symbol} className="border-b border-white/10 transition hover:bg-[#1A1B2B]/50">
                  <td className="px-4 py-4">
                    <div>
                      <p className="font-semibold text-white">{holding.symbol}</p>
                      <p className="text-xs text-[#A1A1B5]">{holding.companyName}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-[#E7E9F3]">{holding.quantity}</td>
                  <td className="px-4 py-4 text-[#E7E9F3]">{formatCurrency(holding.avgBuyPrice)}</td>
                  <td className="px-4 py-4 text-[#E7E9F3]">{formatCurrency(holding.currentPrice)}</td>
                  <td className="px-4 py-4 text-[#E7E9F3]">{formatCurrency(holding.totalInvested)}</td>
                  <td className="px-4 py-4 text-[#E7E9F3]">{formatCurrency(holding.currentValue)}</td>
                  <td className={`px-4 py-4 font-semibold ${holding.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(holding.pnl)}
                  </td>
                  <td className={`px-4 py-4 font-semibold ${holding.pnlPct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatPercent(holding.pnlPct)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Portfolio;
