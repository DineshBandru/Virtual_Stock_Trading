import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, CircleAlert, RefreshCcw, Save, X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import GlassPanel from "../components/GlassPanel";
import HelpTooltip from "../components/HelpTooltip";
import PageHeader from "../components/PageHeader";
import RiskPositionCalculator from "../components/RiskPositionCalculator";
import { Skeleton } from "../components/Skeleton";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "Unavailable";

const formatPercent = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? "+" : ""}${Number(value).toFixed(2)}%` : "Unavailable";

const formatPlainPercent = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : "Unavailable";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

const formatDays = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(Number(value) >= 10 ? 0 : 1)} days` : "Unavailable";

const chartTooltipStyle = {
  background: "rgba(7, 11, 20, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 8
};

const StatCard = ({ label, value, detail, tone = "slate", helpTerm }) => {
  const toneClass = {
    slate: "text-[#A1A1B5]",
    cyan: "text-cyan",
    green: "text-emerald-400",
    red: "text-red-400"
  }[tone];

  return (
    <GlassPanel className="min-h-[126px]">
      <p className="flex items-center gap-2 text-[11px] uppercase text-[#A1A1B5]">
        {label}
        {helpTerm ? <HelpTooltip term={helpTerm} label={label} /> : null}
      </p>
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

const ReviewModal = ({ episodeId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [trade, setTrade] = useState(null);
  const [form, setForm] = useState({
    entryReason: "",
    exitReason: "",
    lesson: "",
    improvement: ""
  });

  useEffect(() => {
    let active = true;
    const loadReview = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await api.get(`/api/trade-reviews/${episodeId}`);
        if (!active) return;
        setTrade(response.data.trade);
        setForm({
          entryReason: response.data.review?.entryReason || "",
          exitReason: response.data.review?.exitReason || "",
          lesson: response.data.review?.lesson || "",
          improvement: response.data.review?.improvement || ""
        });
      } catch (err) {
        if (active) setError(getApiErrorMessage(err, "Unable to load trade review"));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadReview();
    return () => {
      active = false;
    };
  }, [episodeId]);

  const saveReview = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      await api.put(`/api/trade-reviews/${episodeId}`, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save trade review"));
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["entryReason", "Why did I enter this trade?"],
    ["exitReason", "Why did I exit?"],
    ["lesson", "What did I learn?"],
    ["improvement", "What would I do differently?"]
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl">
        <GlassPanel className="max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-cyan">Closed Trade Review</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{trade?.symbol || "Trade Review"}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 p-2 text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
              aria-label="Close trade review"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <Skeleton className="mt-6 h-72 w-full rounded-2xl" />
          ) : error ? (
            <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={saveReview}>
              <div className="grid gap-3 md:grid-cols-4">
                {[
                  ["Entry", formatDate(trade.openedAt)],
                  ["Exit", formatDate(trade.closedAt)],
                  ["Realized P&L", formatCurrency(trade.realizedPnL)],
                  ["Return", formatPercent(trade.returnPercentage)]
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-white/10 bg-[#080910] p-3">
                    <p className="text-[11px] uppercase text-[#A1A1B5]">{label}</p>
                    <p className="mt-2 font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {fields.map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-2 text-xs font-medium uppercase text-[#A1A1B5]">
                    {label}
                    <textarea
                      value={form[key]}
                      onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value.slice(0, 1500) }))}
                      maxLength={1500}
                      rows={4}
                      className="resize-none rounded-lg border border-white/10 bg-[#080910] px-3 py-2 text-sm normal-case leading-6 text-white outline-none focus:border-cyan"
                    />
                  </label>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#A1A1B5]">Review notes are plain text and never edit your financial history.</p>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Review"}
                </button>
              </div>
            </form>
          )}
        </GlassPanel>
      </div>
    </div>
  );
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [user, setUser] = useState(null);
  const [reviewEpisodeId, setReviewEpisodeId] = useState("");

  const loadAnalytics = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError("");
      const [analyticsRes, userRes] = await Promise.all([
        api.get("/api/analytics/performance"),
        api.get("/api/auth/me")
      ]);
      setPayload(analyticsRes.data);
      setUser(userRes.data || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load performance analytics"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    const refreshAnalytics = () => loadAnalytics({ showLoading: false });
    socket.on("transaction-update", refreshAnalytics);
    socket.on("order-update", refreshAnalytics);
    socket.on("connect", refreshAnalytics);
    return () => {
      socket.off("transaction-update", refreshAnalytics);
      socket.off("order-update", refreshAnalytics);
      socket.off("connect", refreshAnalytics);
    };
  }, [loadAnalytics]);

  const chartData = useMemo(
    () =>
      (payload?.equitySeries || []).map((point) => ({
        label: formatDate(point.date),
        equity: Number(point.equity),
        cumulativeRealizedPnL: Number(point.cumulativeRealizedPnL),
        drawdown: Number(point.drawdownPercentage)
      })),
    [payload]
  );

  const metrics = payload?.metrics || {};
  const closedTrades = payload?.closedTrades || [];
  const hasClosedTrades = closedTrades.length > 0;

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Trading Performance" subtitle="Closed-trade analytics, risk practice, and reflection." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => <LoadingCard key={index} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Trading Performance" subtitle="Closed-trade analytics, risk practice, and reflection." />
        <GlassPanel className="border-red-500/30 bg-red-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-200">
                <CircleAlert className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase">Analytics unavailable</h3>
              </div>
              <p className="mt-3 text-sm text-red-100/90">{error}</p>
            </div>
            <button type="button" onClick={loadAnalytics} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20">
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Trading Performance"
          subtitle="Realized performance from executed closed trades only. Open positions are not counted as wins or losses."
        />
        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#121320] px-4 py-3 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {!hasClosedTrades ? (
        <GlassPanel>
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#080910] px-6 py-12 text-center">
            <p className="text-xs font-medium uppercase text-[#A1A1B5]">No closed trades yet</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Performance appears after a full Buy-to-Sell episode closes.</h3>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#A1A1B5]">
              A closed trade begins when your quantity moves from zero to positive and ends when it returns to zero. Open holdings are not counted as wins, losses, or drawdown.
            </p>
          </div>
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <StatCard label="Total Realized P&L" value={formatCurrency(metrics.totalRealizedPnL)} detail="Closed episodes only" tone={metrics.totalRealizedPnL >= 0 ? "green" : "red"} />
            <StatCard label="Win Rate" value={formatPlainPercent(metrics.winRate)} detail={`${metrics.winningTrades || 0} wins / ${metrics.totalClosedTrades || 0} closed`} helpTerm="winRate" />
            <StatCard label="Closed Trades" value={metrics.totalClosedTrades || 0} detail={`${metrics.breakEvenTrades || 0} break-even`} />
            <StatCard label="Average Win" value={formatCurrency(metrics.averageWinningTrade)} detail="Winning closed trades" tone="green" helpTerm="averageWin" />
            <StatCard label="Average Loss" value={formatCurrency(metrics.averageLosingTrade)} detail="Losing closed trades" tone="red" helpTerm="averageLoss" />
            <StatCard label="Max Drawdown" value={formatPlainPercent(metrics.maximumDrawdownPercentage)} detail="From realized equity curve" tone="red" helpTerm="drawdown" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <GlassPanel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">Realized Equity Curve</h3>
                  <p className="mt-2 text-xs text-[#6F7487]">Starting virtual capital plus cumulative realized P&L from closed trades.</p>
                </div>
                <span className="text-xs text-[#A1A1B5]">{chartData.length} points</span>
              </div>
              <div className="mt-6 h-80 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                    <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} width={86} tickFormatter={(value) => `Rs.${Math.round(value / 1000)}k`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(value, name) => [name === "equity" ? formatCurrency(value) : formatPercent(value), name]} />
                    <Line type="monotone" dataKey="equity" stroke="#38BDF8" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlassPanel>

            <GlassPanel>
              <p className="text-xs font-semibold uppercase text-cyan">Learning From Your Trades</p>
              <h3 className="mt-2 text-lg font-semibold text-white">
                Reviewed Trades {metrics.reviewedTrades || 0} / {metrics.totalClosedTrades || 0}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[#C2C4D2]">
                Review closed trades to capture why you entered, why you exited, and what you learned. This is a journal only; it never edits trades.
              </p>
              <div className="mt-5 grid gap-3">
                <div className="rounded-lg border border-white/10 bg-[#080910] p-3">
                  <p className="text-[11px] uppercase text-[#A1A1B5]">Average Return</p>
                  <p className="mt-2 font-semibold text-white">{formatPercent(metrics.averageReturnPercentage)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#080910] p-3">
                  <p className="text-[11px] uppercase text-[#A1A1B5]">Average Holding Period</p>
                  <p className="mt-2 font-semibold text-white">{formatDays(metrics.averageHoldingPeriodDays)}</p>
                </div>
              </div>
            </GlassPanel>
          </div>

          <GlassPanel>
            <h3 className="text-sm font-semibold uppercase text-[#C2C4D2]">Closed Trade History</h3>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
              <div className="hidden bg-[#080910] px-4 py-3 text-[11px] uppercase text-[#A1A1B5] lg:grid lg:grid-cols-12 lg:gap-3">
                <span className="lg:col-span-2">Symbol</span>
                <span className="lg:col-span-2">Entry / Exit</span>
                <span className="lg:col-span-1 text-right">Qty</span>
                <span className="lg:col-span-2 text-right">Avg Entry</span>
                <span className="lg:col-span-2 text-right">Avg Exit</span>
                <span className="lg:col-span-2 text-right">P&L</span>
                <span className="lg:col-span-1 text-right">Review</span>
              </div>
              {closedTrades.map((trade) => (
                <div key={trade.episodeId} className="grid grid-cols-2 gap-3 px-4 py-4 text-sm lg:grid-cols-12 lg:items-center">
                  <div className="col-span-2 lg:col-span-2">
                    <p className="font-mono font-semibold text-white">{trade.symbol}</p>
                    <p className="mt-1 text-xs text-[#A1A1B5]">{trade.holdingPeriod.label}</p>
                  </div>
                  <div className="lg:col-span-2">
                    <p className="text-[#C2C4D2]">{formatDate(trade.openedAt)}</p>
                    <p className="mt-1 text-xs text-[#A1A1B5]">{formatDate(trade.closedAt)}</p>
                  </div>
                  <p className="text-right text-white lg:col-span-1">{trade.quantity}</p>
                  <p className="text-right text-[#C2C4D2] lg:col-span-2">{formatCurrency(trade.weightedAverageEntryPrice)}</p>
                  <p className="text-right text-[#C2C4D2] lg:col-span-2">{formatCurrency(trade.weightedAverageExitPrice)}</p>
                  <div className={`text-right lg:col-span-2 ${trade.realizedPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    <p className="font-semibold">{formatCurrency(trade.realizedPnL)}</p>
                    <p className="mt-1 text-xs">{formatPercent(trade.returnPercentage)}</p>
                  </div>
                  <div className="col-span-2 flex justify-end lg:col-span-1">
                    <button
                      type="button"
                      onClick={() => setReviewEpisodeId(trade.episodeId)}
                      className="inline-flex items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                    >
                      <BookOpenCheck className="h-4 w-4" />
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </>
      )}

      <RiskPositionCalculator availableBalance={user?.balance} />

      {reviewEpisodeId ? (
        <ReviewModal
          episodeId={reviewEpisodeId}
          onClose={() => setReviewEpisodeId("")}
          onSaved={() => loadAnalytics({ showLoading: false })}
        />
      ) : null}
    </div>
  );
};

export default Analytics;
