import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUpDown,
  Filter,
  LineChart,
  RefreshCcw,
  Search,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
  Plus,
  Minus
} from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import HelpTooltip from "../components/HelpTooltip";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import useLivePrices from "../hooks/useLivePrices";
import useToast from "../hooks/useToast";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

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

const formatPercent = (value) => {
  if (value === null || value === undefined || value === "") return "Unavailable";
  const number = Number(value);
  if (!Number.isFinite(number)) return "Unavailable";
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
};

const formatQty = (value) => {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(number);
};

const summaryTone = (value) => (value >= 0 ? "text-emerald-400" : "text-red-400");

const LoadingCard = () => (
  <GlassPanel className="min-h-[126px]">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="mt-4 h-8 w-2/3" />
    <Skeleton className="mt-3 h-3 w-1/2" />
  </GlassPanel>
);

const LoadingTable = () => (
  <div className="space-y-3 rounded-2xl border border-white/10 bg-[#121320] p-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-[#080910] p-4 xl:grid-cols-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    ))}
  </div>
);

const TabButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`rounded-2xl border px-4 py-2 text-xs font-semibold transition ${
      active
        ? "border-cyan/50 bg-cyan/10 text-cyan"
        : "border-white/10 bg-[#080910] text-[#A1A1B5] hover:border-cyan/30 hover:text-[#E7E9F3]"
    }`}
  >
    {children}
  </button>
);

const PositionPill = ({ children, tone = "default" }) => {
  const tones = {
    default: "border-white/10 bg-[#080910] text-[#C2C4D2]",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    danger: "border-red-500/30 bg-red-500/10 text-red-200",
    warning: "border-slate-600 bg-[#1A1B2B] text-[#C2C4D2]"
  };

  return (
    <span className={`rounded-2xl border px-2.5 py-1 text-[10px] font-semibold ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
};

const Positions = () => {
  const { push } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [positionsData, setPositionsData] = useState({ openPositions: [], closedPositions: [], summary: {} });
  const [tab, setTab] = useState("open");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "symbol", direction: "asc" });
  const subscribedSymbols = useMemo(
    () => positionsData.openPositions.map((position) => position.symbol).filter(Boolean),
    [positionsData.openPositions]
  );
  const prices = useLivePrices(subscribedSymbols);

  const loadPositions = useCallback(async ({ showRefreshing = false } = {}) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const response = await api.get("/api/positions");
      setPositionsData({
        openPositions: Array.isArray(response.data?.openPositions) ? response.data.openPositions : [],
        closedPositions: Array.isArray(response.data?.closedPositions) ? response.data.closedPositions : [],
        summary: response.data?.summary || {}
      });
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load positions");
      setError(message);
      push(message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [push]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  useEffect(() => {
    const handleOrdersUpdate = () => {
      loadPositions({ showRefreshing: true });
    };

    socket.on("orders:update", handleOrdersUpdate);
    socket.on("order-update", handleOrdersUpdate);
    socket.on("portfolio-update", handleOrdersUpdate);
    socket.on("position-update", handleOrdersUpdate);
    socket.on("transaction-update", handleOrdersUpdate);
    socket.on("connect", handleOrdersUpdate);

    return () => {
      socket.off("orders:update", handleOrdersUpdate);
      socket.off("order-update", handleOrdersUpdate);
      socket.off("portfolio-update", handleOrdersUpdate);
      socket.off("position-update", handleOrdersUpdate);
      socket.off("transaction-update", handleOrdersUpdate);
      socket.off("connect", handleOrdersUpdate);
    };
  }, [loadPositions]);

  const baseRows = useMemo(() => {
    const source = tab === "open" ? positionsData.openPositions : positionsData.closedPositions;
    return source.map((position) => {
      const livePrice = Number(prices[position.symbol]?.c);
      const fallbackPrice = Number(position.currentPrice);
      const hasPrice = Number.isFinite(livePrice) && livePrice > 0
        ? true
        : Number.isFinite(fallbackPrice) && fallbackPrice > 0;
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : hasPrice ? fallbackPrice : null;
      const currentValue = hasPrice ? currentPrice * Number(position.netQty || 0) : null;
      const investedValue = Number(position.investedValue) || 0;
      const unrealizedPnL = Number(position.netQty || 0) > 0 && hasPrice ? currentValue - investedValue : Number(position.netQty || 0) > 0 ? null : 0;
      const realizedPnL = Number(position.realizedPnL) || 0;
      const totalPnL = realizedPnL + (Number(unrealizedPnL) || 0);
      const pnlBase = investedValue > 0 ? investedValue : Number(position.buyQty || 0) * (Number(position.averageBuyPrice) || 0);
      const pnlPct = pnlBase > 0 ? (totalPnL / pnlBase) * 100 : 0;

      return {
        ...position,
        currentPrice,
        currentValue,
        unrealizedPnL,
        totalPnL,
        pnlPct,
        valuationAvailable: hasPrice
      };
    });
  }, [prices, positionsData.closedPositions, positionsData.openPositions, tab]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return baseRows.filter((row) => {
      const matchesSearch = !query || [row.symbol, row.companyName].some((value) => String(value || "").toLowerCase().includes(query));

      const matchesFilter = (() => {
        if (filter === "all") return true;
        if (filter === "profit") return row.totalPnL > 0;
        if (filter === "loss") return row.totalPnL < 0;
        if (filter === "long") return row.positionType === "LONG";
        if (filter === "partial") return row.positionType === "PARTIALLY_CLOSED";
        if (filter === "closed") return row.positionType === "CLOSED";
        return true;
      })();

      return matchesSearch && matchesFilter;
    });
  }, [baseRows, filter, search]);

  const sortedRows = useMemo(() => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    const key = sortConfig.key;

    return [...filteredRows].sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];

      if (key === "symbol" || key === "companyName" || key === "positionType") {
        return String(leftValue).localeCompare(String(rightValue)) * direction;
      }

      const safeLeft = Number.isFinite(Number(leftValue)) ? Number(leftValue) : 0;
      const safeRight = Number.isFinite(Number(rightValue)) ? Number(rightValue) : 0;
      return (safeLeft - safeRight) * direction;
    });
  }, [filteredRows, sortConfig]);

  const summary = useMemo(() => {
    const openPositions = (positionsData.openPositions || []).map((position) => {
      const livePrice = Number(prices[position.symbol]?.price ?? prices[position.symbol]?.c);
      const fallbackPrice = Number(position.currentPrice);
      const hasPrice = Number.isFinite(livePrice) && livePrice > 0
        ? true
        : Number.isFinite(fallbackPrice) && fallbackPrice > 0;
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : hasPrice ? fallbackPrice : null;
      const currentValue = hasPrice ? currentPrice * Number(position.netQty || 0) : null;
      const investedValue = Number(position.investedValue) || 0;
      return {
        ...position,
        currentPrice,
        currentValue,
        unrealizedPnL: hasPrice ? currentValue - investedValue : null
      };
    });
    const totalOpenPnL = openPositions.reduce((sum, position) => sum + (Number(position.unrealizedPnL) || 0), 0);
    const totalRealizedPnL = Number(positionsData.summary?.totalRealizedPnL) || 0;
    const totalPositions = Number(positionsData.summary?.totalPositions) || 0;
    const winningPositions = Number(positionsData.summary?.winningPositions) || 0;
    const losingPositions = Number(positionsData.summary?.losingPositions) || 0;
    const winRate = totalPositions > 0 ? (winningPositions / totalPositions) * 100 : 0;

    return [
      {
        label: "Total P&L",
        value: totalOpenPnL + totalRealizedPnL,
        detail: `${openPositions.length} open positions`,
        icon: LineChart,
        tone: totalOpenPnL + totalRealizedPnL >= 0 ? "success" : "danger"
      },
      {
        label: "Realized P&L",
        value: totalRealizedPnL,
        detail: "Closed trades captured",
        icon: Wallet,
        tone: totalRealizedPnL >= 0 ? "success" : "danger"
      },
      {
        label: "Unrealized P&L",
        value: totalOpenPnL,
        detail: "Open mark-to-market",
        icon: TrendingUp,
        tone: totalOpenPnL >= 0 ? "success" : "danger"
      },
      {
        label: "Win Rate",
        value: `${winRate.toFixed(2)}%`,
        detail: `${winningPositions} winners / ${losingPositions} losers`,
        icon: ShieldAlert,
        tone: winRate >= 50 ? "success" : "warning"
      },
      {
        label: "Largest Winner",
        value: positionsData.summary?.largestWinner ? `${positionsData.summary.largestWinner.symbol}` : "—",
        detail: positionsData.summary?.largestWinner
          ? `${formatCurrency(positionsData.summary.largestWinner.totalPnL)} • ${formatPercent(positionsData.summary.largestWinner.pnlPct)}`
          : "No winning position yet",
        icon: TrendingUp,
        tone: "success"
      },
      {
        label: "Largest Loser",
        value: positionsData.summary?.largestLoser ? `${positionsData.summary.largestLoser.symbol}` : "—",
        detail: positionsData.summary?.largestLoser
          ? `${formatCurrency(positionsData.summary.largestLoser.totalPnL)} • ${formatPercent(positionsData.summary.largestLoser.pnlPct)}`
          : "No losing position yet",
        icon: TrendingDown,
        tone: "danger"
      }
    ];
  }, [positionsData.summary, positionsData.openPositions, prices]);

  const filterOptions = tab === "open"
    ? [
        { value: "all", label: "All" },
        { value: "long", label: "Long" },
        { value: "partial", label: "Partial" },
        { value: "profit", label: "Profit" },
        { value: "loss", label: "Loss" }
      ]
    : [
        { value: "all", label: "All" },
        { value: "closed", label: "Closed" },
        { value: "profit", label: "Profit" },
        { value: "loss", label: "Loss" }
      ];

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-[#6F7487]" />;
    }

    return sortConfig.direction === "asc" ? (
      <ArrowDownAZ className="h-4 w-4 text-cyan" />
    ) : (
      <ArrowDownZA className="h-4 w-4 text-cyan" />
    );
  };

  const toggleSort = (key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  };

  const emptyMessage = tab === "open"
    ? "You do not have any open positions yet. Once an order fills, open positions will appear here."
    : "No closed positions yet. Completed exits and squared-off positions will appear here.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Positions"
          subtitle="Track open, partially closed, and closed positions with live mark-to-market pricing and realized trade history."
        />
        <button
          type="button"
          onClick={() => loadPositions({ showRefreshing: true })}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#121320] px-4 py-2 text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
        >
          <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? summary.map((item) => <LoadingCard key={item.label} />) : summary.map((item) => {
          const Icon = item.icon;
          return (
            <GlassPanel key={item.label} className="min-h-[126px]">
              <div className="flex items-start justify-between gap-3">
                <div>
          <p className="flex items-center gap-2 text-[11px] uppercase text-[#A1A1B5]">
            {item.label}
            {item.label === "Realized P&L" ? <HelpTooltip term="realizedPnl" label="Realized P&L" /> : null}
            {item.label === "Unrealized P&L" ? <HelpTooltip term="unrealizedPnl" label="Unrealized P&L" /> : null}
          </p>
                  <p className={`mt-3 text-2xl font-semibold ${typeof item.value === "number" ? summaryTone(item.value) : "text-white"}`}>
                    {typeof item.value === "number" ? formatCurrency(item.value) : item.value}
                  </p>
                  <p className="mt-2 text-xs text-[#A1A1B5]">{item.detail}</p>
                </div>
                <span className={`rounded-2xl border p-3 ${item.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : item.tone === "danger" ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-white/10 bg-[#1A1B2B] text-[#C2C4D2]"}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <GlassPanel className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <TabButton active={tab === "open"} onClick={() => setTab("open")}>Open Positions</TabButton>
            <TabButton active={tab === "closed"} onClick={() => setTab("closed")}>Closed Positions</TabButton>
          </div>
          <div className="rounded-full border border-white/10 bg-[#080910] px-3 py-1 text-[11px] uppercase text-[#A1A1B5]">
            {tab === "open" ? `${positionsData.openPositions.length} open` : `${positionsData.closedPositions.length} closed`}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7487]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search symbol or company"
              className="w-full rounded-2xl border border-white/10 bg-[#121320] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#6F7487] focus:border-cyan/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-[#6F7487]" />
            {filterOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                  filter === item.value
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-white/10 bg-[#080910] text-[#A1A1B5] hover:border-cyan/30 hover:text-[#E7E9F3]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setSearch("");
              setFilter("all");
              setSortConfig({ key: "symbol", direction: "asc" });
            }}
            className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-2 text-xs font-semibold text-[#A1A1B5] transition hover:border-cyan/30 hover:text-[#E7E9F3]"
          >
            Reset
          </button>
        </div>

        {loading ? (
          <LoadingTable />
        ) : sortedRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#080910] p-8 md:p-10">
            <p className="text-xs font-medium text-[#A1A1B5]">{tab === "open" ? "No open positions" : "No closed positions"}</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">{emptyMessage}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#C2C4D2]">
              Search for a stock, place a virtual Buy order, and executed trades will flow into this view automatically. Closed exits will appear after you sell.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/"
                className="rounded-2xl bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/orders"
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#E7E9F3] transition hover:bg-white/5"
              >
                View Orders
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#121320] xl:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-left">
                  <thead className="bg-[#080910] text-[11px] uppercase text-[#A1A1B5]">
                    <tr>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("symbol")} className="inline-flex items-center gap-2">
                          Symbol {renderSortIcon("symbol")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("netQty")} className="inline-flex items-center gap-2">
                          Qty {renderSortIcon("netQty")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <span className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => toggleSort("averageBuyPrice")} className="inline-flex items-center gap-2">
                            Avg Price {renderSortIcon("averageBuyPrice")}
                          </button>
                          <HelpTooltip term="averagePrice" label="Average Price" />
                        </span>
                      </th>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("currentPrice")} className="inline-flex items-center gap-2">
                          Current Price {renderSortIcon("currentPrice")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("investedValue")} className="inline-flex items-center gap-2">
                          Invested {renderSortIcon("investedValue")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <span className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => toggleSort("currentValue")} className="inline-flex items-center gap-2">
                            Current Value {renderSortIcon("currentValue")}
                          </button>
                          <HelpTooltip term="currentValue" label="Current Value" />
                        </span>
                      </th>
                      <th className="px-4 py-4">
                        <span className="inline-flex items-center gap-2">
                          <button type="button" onClick={() => toggleSort("totalPnL")} className="inline-flex items-center gap-2">
                            P&L {renderSortIcon("totalPnL")}
                          </button>
                          <HelpTooltip term="unrealizedPnl" label="Position P&L" />
                        </span>
                      </th>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("pnlPct")} className="inline-flex items-center gap-2">
                          P&L % {renderSortIcon("pnlPct")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <span className="text-[11px] uppercase">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {sortedRows.map((row) => {
                      const isProfit = row.totalPnL >= 0;
                      return (
                        <tr key={row.symbol} className="transition hover:bg-white/5">
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Link to={`/stocks/${row.symbol}`} className="font-mono text-sm font-semibold text-white hover:text-cyan">
                                  {row.symbol}
                                </Link>
                                <PositionPill tone={row.positionType === "LONG" ? "success" : row.positionType === "PARTIALLY_CLOSED" ? "warning" : "default"}>
                                  {row.positionType.replace("_", " ")}
                                </PositionPill>
                              </div>
                              <p className="text-xs text-[#6F7487]">{row.companyName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-sm text-[#E7E9F3]">{formatQty(row.netQty)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-[#E7E9F3]">{formatCurrency(row.averageBuyPrice)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-[#E7E9F3]">{formatCurrency(row.currentPrice)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-[#E7E9F3]">{formatCurrency(row.investedValue)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-[#E7E9F3]">{formatCurrency(row.currentValue)}</td>
                          <td className={`px-4 py-4 font-mono text-sm ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                            {formatCurrency(row.totalPnL)}
                          </td>
                          <td className={`px-4 py-4 font-mono text-sm ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                            {formatPercent(row.pnlPct)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/stocks/${row.symbol}`)}
                                className="inline-flex items-center gap-1 rounded-2xl border border-cyan/50 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Buy
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/stocks/${row.symbol}`)}
                                disabled={row.netQty === 0}
                                className="inline-flex items-center gap-1 rounded-2xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Minus className="h-3.5 w-3.5" />
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid gap-3 xl:hidden">
              {sortedRows.map((row) => {
                const isProfit = row.totalPnL >= 0;
                return (
                  <div key={row.symbol} className="rounded-2xl border border-white/10 bg-[#121320] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link to={`/stocks/${row.symbol}`} className="font-mono text-base font-semibold text-white hover:text-cyan">
                            {row.symbol}
                          </Link>
                          <PositionPill tone={row.positionType === "LONG" ? "success" : row.positionType === "PARTIALLY_CLOSED" ? "warning" : "default"}>
                            {row.positionType.replace("_", " ")}
                          </PositionPill>
                        </div>
                        <p className="mt-1 text-sm text-[#A1A1B5]">{row.companyName}</p>
                      </div>
                      <div className={`text-right ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                        <p className="font-mono text-lg font-semibold text-white">{formatCurrency(row.totalPnL)}</p>
                        <p className="text-xs font-medium">{formatPercent(row.pnlPct)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#A1A1B5]">
                      <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                        <p>Qty</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatQty(row.netQty)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                        <p>Avg Price</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.averageBuyPrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                        <p>Current Price</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.currentPrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                        <p>Invested</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.investedValue)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                        <p>Current Value</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.currentValue)}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                        <p>Direction</p>
                        <p className={`mt-1 font-mono text-sm ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                          {row.totalPnL >= 0 ? "Profit" : "Loss"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${row.symbol}`)}
                                className="flex-1 inline-flex items-center justify-center gap-1 rounded-2xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${row.symbol}`)}
                        disabled={row.netQty === 0}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-2xl border border-red-400/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-3.5 w-3.5" />
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </GlassPanel>
    </div>
  );
};

export default Positions;
