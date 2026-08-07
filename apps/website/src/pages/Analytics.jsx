import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, RefreshCcw } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import PnlAreaChart from "../components/charts/PnlAreaChart";
import SectorPieChart from "../components/charts/SectorPieChart";
import useLivePrices from "../hooks/useLivePrices";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

const STARTING_CAPITAL = 1000000;

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const number = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2
});

const formatCurrency = (value) => money.format(Number(value) || 0);

const formatNumber = (value) => number.format(Number(value) || 0);

const formatPercent = (value) => {
  const numeric = Number(value) || 0;
  return `${numeric >= 0 ? "+" : ""}${numeric.toFixed(2)}%`;
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

const buildPerformanceSeries = (transactions) => {
  const sorted = [...transactions].sort(
    (left, right) => new Date(left.timestamp) - new Date(right.timestamp)
  );

  if (sorted.length === 0) return [];

  const groupedByDay = new Map();
  sorted.forEach((transaction) => {
    const key = toDayKey(transaction.timestamp);
    groupedByDay.set(key, [...(groupedByDay.get(key) || []), transaction]);
  });

  const positions = new Map();
  let cash = STARTING_CAPITAL;
  const series = [];

  for (let cursor = startOfDay(sorted[0].timestamp); cursor <= startOfDay(new Date()); cursor = addDays(cursor, 1)) {
    const dayKey = toDayKey(cursor);
    const trades = groupedByDay.get(dayKey) || [];

    trades.forEach((transaction) => {
      const symbol = transaction.symbol;
      const quantity = Number(transaction.quantity) || 0;
      const total = Number(transaction.total) || 0;
      const price = Number(transaction.price) || 0;
      const position = positions.get(symbol) || { quantity: 0, lastPrice: price };

      if (transaction.type === "BUY") {
        cash -= total;
        position.quantity += quantity;
      } else if (transaction.type === "SELL") {
        cash += total;
        position.quantity -= quantity;
      }

      position.lastPrice = price;

      if (position.quantity <= 0) {
        positions.delete(symbol);
      } else {
        positions.set(symbol, position);
      }
    });

    const holdingsValue = Array.from(positions.values()).reduce(
      (sum, item) => sum + item.quantity * item.lastPrice,
      0
    );
    const equity = cash + holdingsValue;

    series.push({
      label: dayKey.slice(5),
      value: Number(((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100).toFixed(2)
    });
  }

  return series;
};

const StatCard = ({ label, value, detail, tone = "slate" }) => {
  const toneClass = {
    slate: "text-[#A1A1B5]",
    cyan: "text-cyan",
    green: "text-emerald-400",
    red: "text-red-400",
    amber: "text-red-400"
  }[tone];

  return (
    <GlassPanel className="min-h-[126px]">
      <p className="text-[11px] uppercase text-[#A1A1B5]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white md:text-3xl">{value}</p>
      {detail ? <p className={`mt-2 text-xs ${toneClass}`}>{detail}</p> : null}
    </GlassPanel>
  );
};

const LoadingCard = () => (
  <GlassPanel className="min-h-[126px]">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="mt-4 h-8 w-2/3" />
    <Skeleton className="mt-3 h-3 w-1/2" />
  </GlassPanel>
);

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [holdings, setHoldings] = useState([]);
  const [portfolioAnalytics, setPortfolioAnalytics] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [positions, setPositions] = useState({ openPositions: [], closedPositions: [], summary: {} });
  const subscribedSymbols = useMemo(
    () => [
      ...holdings.map((holding) => holding.symbol),
      ...positions.openPositions.map((position) => position.symbol)
    ].filter(Boolean),
    [holdings, positions.openPositions]
  );
  const prices = useLivePrices(subscribedSymbols);

  const loadAnalytics = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const [portfolioRes, analyticsRes, transactionsRes, positionsRes] = await Promise.all([
        api.get("/api/portfolio"),
        api.get("/api/portfolio/analytics"),
        api.get("/api/transactions"),
        api.get("/api/positions")
      ]);

      setHoldings(Array.isArray(portfolioRes.data) ? portfolioRes.data : []);
      setPortfolioAnalytics(analyticsRes.data || null);
      setTransactions(Array.isArray(transactionsRes.data) ? transactionsRes.data : []);
      setPositions({
        openPositions: Array.isArray(positionsRes.data?.openPositions) ? positionsRes.data.openPositions : [],
        closedPositions: Array.isArray(positionsRes.data?.closedPositions) ? positionsRes.data.closedPositions : [],
        summary: positionsRes.data?.summary || {}
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load analytics"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const refreshAnalytics = () => loadAnalytics({ showLoading: false });

    socket.on("analytics-update", refreshAnalytics);
    socket.on("portfolio-update", refreshAnalytics);
    socket.on("position-update", refreshAnalytics);
    socket.on("transaction-update", refreshAnalytics);
    socket.on("order-update", refreshAnalytics);
    socket.on("connect", refreshAnalytics);

    return () => {
      socket.off("analytics-update", refreshAnalytics);
      socket.off("portfolio-update", refreshAnalytics);
      socket.off("position-update", refreshAnalytics);
      socket.off("transaction-update", refreshAnalytics);
      socket.off("order-update", refreshAnalytics);
      socket.off("connect", refreshAnalytics);
    };
  }, [loadAnalytics]);

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

      return {
        ...holding,
        currentPrice,
        currentValue,
        totalInvested: investedValue,
        investedValue,
        pnl: hasPrice ? currentValue - investedValue : null,
        pnlPct: hasPrice && investedValue > 0 ? ((currentValue - investedValue) / investedValue) * 100 : null,
        valuationAvailable: hasPrice
      };
    });
  }, [holdings, prices]);

  const livePositions = useMemo(() => {
    const openPositions = positions.openPositions.map((position) => {
      const quote = prices[position.symbol];
      const livePrice = Number(quote?.price ?? quote?.c);
      const fallbackPrice = Number(position.currentPrice);
      const hasPrice = Number.isFinite(livePrice) && livePrice > 0
        ? true
        : Number.isFinite(fallbackPrice) && fallbackPrice > 0;
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : hasPrice ? fallbackPrice : null;
      const currentValue = hasPrice ? currentPrice * Number(position.netQty || 0) : null;
      const investedValue = Number(position.investedValue) || 0;
      const unrealizedPnL = hasPrice ? currentValue - investedValue : null;
      return {
        ...position,
        currentPrice,
        currentValue,
        unrealizedPnL,
        totalPnL: (Number(position.realizedPnL) || 0) + (Number(unrealizedPnL) || 0),
        valuationAvailable: hasPrice
      };
    });
    return {
      openPositions,
      closedPositions: positions.closedPositions,
      summary: {
        ...positions.summary,
        totalOpenPnL: openPositions.reduce((sum, position) => sum + (Number(position.unrealizedPnL) || 0), 0)
      }
    };
  }, [positions, prices]);

  const derived = useMemo(() => {
    const buyCount = transactions.filter((transaction) => transaction.type === "BUY").length;
    const sellCount = transactions.filter((transaction) => transaction.type === "SELL").length;
    const realizedPnL = Number(livePositions.summary?.totalRealizedPnL) || 0;
    const unrealizedPnL =
      Number(livePositions.summary?.totalOpenPnL) ||
      livePositions.openPositions.reduce((sum, position) => sum + (Number(position.unrealizedPnL) || 0), 0);

    const allPositionRows = [...livePositions.openPositions, ...livePositions.closedPositions].map((position) => ({
      ...position,
      totalPnL: Number(position.totalPnL) || Number(position.realizedPnL) || Number(position.unrealizedPnL) || 0,
      pnlPct: Number(position.pnlPct) || 0
    }));

    const profitableRows = allPositionRows.filter((position) => position.totalPnL > 0);
    const losingRows = allPositionRows.filter((position) => position.totalPnL < 0);
    const bestTrade = profitableRows.sort((left, right) => right.totalPnL - left.totalPnL)[0] || null;
    const worstTrade = losingRows.sort((left, right) => left.totalPnL - right.totalPnL)[0] || null;

    const allocationData = liveHoldings
      .filter((holding) => Number(holding.currentValue) > 0)
      .sort((left, right) => Number(right.currentValue) - Number(left.currentValue))
      .map((holding) => ({
        label: holding.symbol,
        value: Number(holding.currentValue) || 0,
        companyName: holding.companyName,
        quantity: Number(holding.quantity) || 0,
        percent: Number(portfolioAnalytics?.currentValue)
          ? ((Number(holding.currentValue) || 0) / Number(portfolioAnalytics.currentValue)) * 100
          : 0
      }));

    return {
      totalInvested: Number(portfolioAnalytics?.invested) || 0,
      currentValue: liveHoldings.some((holding) => holding.valuationAvailable === false)
        ? Number(portfolioAnalytics?.currentValue) || 0
        : liveHoldings.reduce((sum, holding) => sum + (Number(holding.currentValue) || 0), 0),
      realizedPnL,
      unrealizedPnL,
      totalTrades: transactions.length,
      buyCount,
      sellCount,
      bestTrade,
      worstTrade,
      performanceData: buildPerformanceSeries(transactions),
      allocationData
    };
  }, [liveHoldings, livePositions, portfolioAnalytics, transactions]);

  const hasTrades = derived.totalTrades > 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Advanced Analytics" subtitle="Performance insights, win rate, exposure, and trade history." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <LoadingCard key={index} />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel><Skeleton className="h-[280px] w-full rounded-2xl" /></GlassPanel>
          <GlassPanel><Skeleton className="h-[280px] w-full rounded-2xl" /></GlassPanel>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Advanced Analytics" subtitle="Performance insights, win rate, exposure, and trade history." />
        <GlassPanel className="border-red-500/30 bg-red-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-200">
                <CircleAlert className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase">Analytics unavailable</h3>
              </div>
              <p className="mt-3 text-sm text-red-100/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadAnalytics}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (!hasTrades) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Advanced Analytics" subtitle="Performance insights, win rate, exposure, and trade history." />
        <GlassPanel>
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#080910] px-6 py-12 text-center">
            <p className="text-xs font-medium text-[#A1A1B5]">No trading data</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Analytics will appear after your first trade</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#A1A1B5]">
              Once buy or sell transactions exist, this page will calculate invested capital, P/L, trade counts,
              growth, and stock-wise allocation from your real account data.
            </p>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Advanced Analytics"
        subtitle="Real trading performance from your portfolio, positions, and transaction history."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Invested" value={formatCurrency(derived.totalInvested)} detail="Current open holdings" />
        <StatCard label="Current Value" value={formatCurrency(derived.currentValue)} detail="Live portfolio value" tone="cyan" />
        <StatCard
          label="Realized P/L"
          value={formatCurrency(derived.realizedPnL)}
          detail="From closed or sold positions"
          tone={derived.realizedPnL >= 0 ? "green" : "red"}
        />
        <StatCard
          label="Unrealized P/L"
          value={formatCurrency(derived.unrealizedPnL)}
          detail="Open position mark-to-market"
          tone={derived.unrealizedPnL >= 0 ? "green" : "red"}
        />
        <StatCard label="Total Trades" value={formatNumber(derived.totalTrades)} detail="All transaction records" />
        <StatCard label="Buy Count" value={formatNumber(derived.buyCount)} detail="Executed buy transactions" tone="cyan" />
        <StatCard label="Sell Count" value={formatNumber(derived.sellCount)} detail="Executed sell transactions" tone="amber" />
        <StatCard
          label="Net Performance"
          value={formatPercent(((derived.currentValue + derived.realizedPnL - derived.totalInvested) / STARTING_CAPITAL) * 100)}
          detail="Available from current APIs"
          tone="slate"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">Portfolio Growth</h3>
              <p className="mt-2 text-xs text-[#6F7487]">Estimated from transaction history</p>
            </div>
            <span className="text-xs text-[#A1A1B5]">%</span>
          </div>
          <div className="mt-6">
            <PnlAreaChart data={derived.performanceData} />
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">Stock Allocation</h3>
              <p className="mt-2 text-xs text-[#6F7487]">Current holdings by value</p>
            </div>
            <span className="text-xs text-[#A1A1B5]">{derived.allocationData.length} stocks</span>
          </div>
          <div className="mt-6">
            <SectorPieChart data={derived.allocationData} />
          </div>
        </GlassPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel>
          <p className="text-xs uppercase text-[#A1A1B5]">Best / Worst</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="text-xs font-medium text-emerald-400">Best profitable trade</p>
              {derived.bestTrade ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-white">{derived.bestTrade.symbol}</p>
                  <p className="mt-1 text-sm text-[#C2C4D2]">{derived.bestTrade.companyName}</p>
                  <p className="mt-3 text-xl font-semibold text-emerald-400">{formatCurrency(derived.bestTrade.totalPnL)}</p>
                  <p className="mt-1 text-xs text-[#A1A1B5]">{formatPercent(derived.bestTrade.pnlPct)}</p>
                </>
              ) : (
                <p className="mt-4 text-sm text-[#A1A1B5]">No profitable position data yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
              <p className="text-xs font-medium text-red-400">Worst losing trade</p>
              {derived.worstTrade ? (
                <>
                  <p className="mt-3 text-lg font-semibold text-white">{derived.worstTrade.symbol}</p>
                  <p className="mt-1 text-sm text-[#C2C4D2]">{derived.worstTrade.companyName}</p>
                  <p className="mt-3 text-xl font-semibold text-red-400">{formatCurrency(derived.worstTrade.totalPnL)}</p>
                  <p className="mt-1 text-xs text-[#A1A1B5]">{formatPercent(derived.worstTrade.pnlPct)}</p>
                </>
              ) : (
                <p className="mt-4 text-sm text-[#A1A1B5]">No losing position data yet.</p>
              )}
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <p className="text-xs uppercase text-[#A1A1B5]">Allocation List</p>
          <div className="mt-5 space-y-3">
            {derived.allocationData.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#080910] px-4 py-8 text-center text-sm text-[#A1A1B5]">
                No active stock allocation. Closed trades remain reflected in history and realized P/L.
              </div>
            ) : (
              derived.allocationData.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-[#080910] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-[#A1A1B5]">{item.companyName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(item.value)}</p>
                      <p className="mt-1 text-xs text-cyan">{item.percent.toFixed(2)}%</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1A1B2B]">
                    <div className="h-full rounded-full bg-cyan" style={{ width: `${Math.min(item.percent, 100)}%` }} />
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

export default Analytics;
