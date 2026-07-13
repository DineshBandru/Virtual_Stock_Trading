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
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import useLivePrices from "../hooks/useLivePrices";
import useToast from "../hooks/useToast";
import api from "../utils/api";
import socket from "../utils/socket";

const formatCurrency = (value) => {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(number);
};

const formatPercent = (value) => {
  const number = Number(value) || 0;
  return `${number >= 0 ? "+" : ""}${number.toFixed(2)}%`;
};

const formatQty = (value) => {
  const number = Number(value) || 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(number);
};

const summaryTone = (value) => (value >= 0 ? "text-emerald-300" : "text-red-300");

const LoadingCard = () => (
  <GlassPanel className="min-h-[126px]">
    <Skeleton className="h-4 w-28" />
    <Skeleton className="mt-4 h-8 w-2/3" />
    <Skeleton className="mt-3 h-3 w-1/2" />
  </GlassPanel>
);

const LoadingTable = () => (
  <div className="space-y-3 rounded-2xl border border-borderGlow/50 bg-panel/60 p-4">
    {Array.from({ length: 5 }).map((_, index) => (
      <div key={index} className="grid gap-3 rounded-2xl border border-borderGlow/40 bg-base/60 p-4 xl:grid-cols-8">
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
    className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
      active
        ? "border-cyan/50 bg-cyan/10 text-cyan"
        : "border-borderGlow/60 bg-base/60 text-slate-400 hover:border-cyan/30 hover:text-slate-200"
    }`}
  >
    {children}
  </button>
);

const PositionPill = ({ children, tone = "default" }) => {
  const tones = {
    default: "border-borderGlow/60 bg-base/70 text-slate-300",
    success: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    danger: "border-red-400/30 bg-red-400/10 text-red-200",
    warning: "border-amber-400/30 bg-amber-400/10 text-amber-200"
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] ${tones[tone] || tones.default}`}>
      {children}
    </span>
  );
};

const Positions = () => {
  const prices = useLivePrices();
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
      const message = err?.response?.data?.message || "Failed to load positions";
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
    const timer = window.setInterval(() => {
      loadPositions({ showRefreshing: true });
    }, 15000);

    return () => window.clearInterval(timer);
  }, [loadPositions]);

  useEffect(() => {
    const handleOrdersUpdate = () => {
      loadPositions({ showRefreshing: true });
    };

    const handlePricesUpdate = () => {
      if (!loading) {
        setPositionsData((current) => ({ ...current }));
      }
    };

    socket.on("orders:update", handleOrdersUpdate);
    socket.on("prices:update", handlePricesUpdate);

    return () => {
      socket.off("orders:update", handleOrdersUpdate);
      socket.off("prices:update", handlePricesUpdate);
    };
  }, [loadPositions, loading]);

  const baseRows = useMemo(() => {
    const source = tab === "open" ? positionsData.openPositions : positionsData.closedPositions;
    return source.map((position) => {
      const livePrice = Number(prices[position.symbol]?.c);
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : Number(position.currentPrice) || 0;
      const currentValue = currentPrice * Number(position.netQty || 0);
      const investedValue = Number(position.investedValue) || 0;
      const unrealizedPnL = Number(position.netQty || 0) > 0 ? currentValue - investedValue : 0;
      const realizedPnL = Number(position.realizedPnL) || 0;
      const totalPnL = realizedPnL + unrealizedPnL;
      const pnlBase = investedValue > 0 ? investedValue : Number(position.buyQty || 0) * (Number(position.averageBuyPrice) || 0);
      const pnlPct = pnlBase > 0 ? (totalPnL / pnlBase) * 100 : 0;

      return {
        ...position,
        currentPrice,
        currentValue,
        unrealizedPnL,
        totalPnL,
        pnlPct
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
    const openPositions = positionsData.openPositions || [];
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
  }, [positionsData.summary, positionsData.openPositions]);

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
      return <ArrowUpDown className="h-4 w-4 text-slate-500" />;
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Positions"
          subtitle="Track open, partially closed, and closed positions with live mark-to-market pricing and realized trade history."
        />
        <button
          type="button"
          onClick={() => loadPositions({ showRefreshing: true })}
          className="inline-flex items-center gap-2 rounded-full border border-borderGlow/60 bg-panel/70 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan/40 hover:text-cyan"
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
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">{item.label}</p>
                  <p className={`mt-3 text-2xl font-semibold ${typeof item.value === "number" ? summaryTone(item.value) : "text-white"}`}>
                    {typeof item.value === "number" ? formatCurrency(item.value) : item.value}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">{item.detail}</p>
                </div>
                <span className={`rounded-2xl border p-3 ${item.tone === "success" ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : item.tone === "danger" ? "border-red-400/30 bg-red-400/10 text-red-200" : "border-amber-400/30 bg-amber-400/10 text-amber-200"}`}>
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
          <div className="rounded-full border border-borderGlow/60 bg-base/60 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
            {tab === "open" ? `${positionsData.openPositions.length} open` : `${positionsData.closedPositions.length} closed`}
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search symbol or company"
              className="w-full rounded-2xl border border-borderGlow/60 bg-panel/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            {filterOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  filter === item.value
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-borderGlow/60 bg-base/60 text-slate-400 hover:border-cyan/30 hover:text-slate-200"
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
            className="rounded-full border border-borderGlow/60 bg-base/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 transition hover:border-cyan/30 hover:text-slate-200"
          >
            Reset
          </button>
        </div>

        {loading ? (
          <LoadingTable />
        ) : sortedRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-cyan/30 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.12),_transparent_45%),linear-gradient(180deg,rgba(15,23,42,0.65),rgba(15,23,42,0.35))] p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan/70">{tab === "open" ? "No Open Positions" : "No Closed Positions"}</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">{emptyMessage}</h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Use the OMS to place orders and let completed trades flow into this view automatically.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/"
                className="rounded-full bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
              >
                Go to Dashboard
              </Link>
              <Link
                to="/orders"
                className="rounded-full border border-borderGlow/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                View Orders
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-borderGlow/50 bg-panel/60 xl:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-borderGlow/50 text-left">
                  <thead className="bg-base/60 text-[11px] uppercase tracking-[0.24em] text-slate-400">
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
                        <button type="button" onClick={() => toggleSort("averageBuyPrice")} className="inline-flex items-center gap-2">
                          Avg Price {renderSortIcon("averageBuyPrice")}
                        </button>
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
                        <button type="button" onClick={() => toggleSort("currentValue")} className="inline-flex items-center gap-2">
                          Current Value {renderSortIcon("currentValue")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("totalPnL")} className="inline-flex items-center gap-2">
                          P&L {renderSortIcon("totalPnL")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <button type="button" onClick={() => toggleSort("pnlPct")} className="inline-flex items-center gap-2">
                          P&L % {renderSortIcon("pnlPct")}
                        </button>
                      </th>
                      <th className="px-4 py-4">
                        <span className="text-[11px] uppercase tracking-[0.24em]">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-borderGlow/30">
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
                              <p className="text-xs text-slate-500">{row.companyName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-sm text-slate-200">{formatQty(row.netQty)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-slate-200">{formatCurrency(row.averageBuyPrice)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-slate-200">{formatCurrency(row.currentPrice)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-slate-200">{formatCurrency(row.investedValue)}</td>
                          <td className="px-4 py-4 font-mono text-sm text-slate-200">{formatCurrency(row.currentValue)}</td>
                          <td className={`px-4 py-4 font-mono text-sm ${isProfit ? "text-emerald-300" : "text-red-300"}`}>
                            {formatCurrency(row.totalPnL)}
                          </td>
                          <td className={`px-4 py-4 font-mono text-sm ${isProfit ? "text-emerald-300" : "text-red-300"}`}>
                            {formatPercent(row.pnlPct)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => navigate(`/stocks/${row.symbol}`)}
                                className="inline-flex items-center gap-1 rounded-lg border border-cyan/50 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Buy
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate(`/stocks/${row.symbol}`)}
                                disabled={row.netQty === 0}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-400/50 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <div key={row.symbol} className="rounded-2xl border border-borderGlow/50 bg-panel/60 p-4">
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
                        <p className="mt-1 text-sm text-slate-400">{row.companyName}</p>
                      </div>
                      <div className={`text-right ${isProfit ? "text-emerald-300" : "text-red-300"}`}>
                        <p className="font-mono text-lg font-semibold text-white">{formatCurrency(row.totalPnL)}</p>
                        <p className="text-xs font-medium">{formatPercent(row.pnlPct)}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-400">
                      <div className="rounded-2xl border border-borderGlow/40 bg-base/60 p-3">
                        <p>Qty</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatQty(row.netQty)}</p>
                      </div>
                      <div className="rounded-2xl border border-borderGlow/40 bg-base/60 p-3">
                        <p>Avg Price</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.averageBuyPrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-borderGlow/40 bg-base/60 p-3">
                        <p>Current Price</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.currentPrice)}</p>
                      </div>
                      <div className="rounded-2xl border border-borderGlow/40 bg-base/60 p-3">
                        <p>Invested</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.investedValue)}</p>
                      </div>
                      <div className="rounded-2xl border border-borderGlow/40 bg-base/60 p-3">
                        <p>Current Value</p>
                        <p className="mt-1 font-mono text-sm text-white">{formatCurrency(row.currentValue)}</p>
                      </div>
                      <div className="rounded-2xl border border-borderGlow/40 bg-base/60 p-3">
                        <p>Direction</p>
                        <p className={`mt-1 font-mono text-sm ${isProfit ? "text-emerald-300" : "text-red-300"}`}>
                          {row.totalPnL >= 0 ? "Profit" : "Loss"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${row.symbol}`)}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-cyan/50 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Buy
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/stocks/${row.symbol}`)}
                        disabled={row.netQty === 0}
                        className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-red-400/50 bg-red-400/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Minus className="h-3.5 w-3.5" />
                        Sell
                      </button>
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