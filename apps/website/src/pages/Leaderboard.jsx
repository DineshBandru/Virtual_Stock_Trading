import { useEffect, useState } from "react";
import { CircleAlert, RefreshCcw, Trophy } from "lucide-react";
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

const formatPercent = (value) =>
  Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)}%` : "-";

const Leaderboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/leaderboard");
      setRows(Array.isArray(response.data?.rows) ? response.data.rows : []);
      setCurrentUser(response.data?.currentUser || null);
    } catch (err) {
      setRows([]);
      setCurrentUser(null);
      setError(getApiErrorMessage(err, "Failed to load leaderboard"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Leaderboard" subtitle="Ranked by real portfolio value and cash balance." />
        <GlassPanel>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        </GlassPanel>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader title="Leaderboard" subtitle="Ranked by real portfolio value and cash balance." />
        <GlassPanel className="border-red-500/30 bg-red-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-200">
                <CircleAlert className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase">Leaderboard unavailable</h3>
              </div>
              <p className="mt-3 text-sm text-red-100/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadLeaderboard}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300/60 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
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
        title="Leaderboard"
        subtitle="Normal users ranked by cash plus current holding value."
      />

      {currentUser ? (
        <GlassPanel className="border-cyan/30 bg-cyan/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan/30 bg-base text-cyan">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase text-cyan">Your rank</p>
                <h3 className="mt-1 text-xl font-semibold text-white">#{currentUser.rank}</h3>
              </div>
            </div>
            <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <span>Value {formatCurrency(currentUser.portfolioValue)}</span>
              <span>P/L {formatCurrency(currentUser.profitLoss)}</span>
              <span>Trades {formatNumber(currentUser.tradeCount)}</span>
            </div>
          </div>
        </GlassPanel>
      ) : null}

      <GlassPanel>
        {rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-borderGlow bg-base px-4 py-10 text-center text-sm text-slate-400">
            No eligible users found for the leaderboard.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-borderGlow text-sm">
              <thead className="bg-slate-900/40 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">Trader</th>
                  <th className="px-4 py-3 text-right">Portfolio Value</th>
                  <th className="px-4 py-3 text-right">Profit / Loss</th>
                  <th className="px-4 py-3 text-right">Return</th>
                  <th className="px-4 py-3 text-right">Trades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderGlow">
                {rows.map((row) => (
                  <tr key={`${row.rank}-${row.name}`} className={row.isCurrentUser ? "bg-cyan/10" : "bg-panel"}>
                    <td className="px-4 py-4 font-semibold text-white">#{row.rank}</td>
                    <td className="px-4 py-4 text-slate-200">{row.name || "Trader"}</td>
                    <td className="px-4 py-4 text-right font-mono text-slate-200">{formatCurrency(row.portfolioValue)}</td>
                    <td className={`px-4 py-4 text-right font-mono ${Number(row.profitLoss) >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                      {formatCurrency(row.profitLoss)}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-slate-300">{formatPercent(row.returnPct)}</td>
                    <td className="px-4 py-4 text-right font-mono text-slate-300">{formatNumber(row.tradeCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassPanel>
    </div>
  );
};

export default Leaderboard;
