import { useEffect, useState } from "react";
import { CircleAlert, RefreshCcw, Trophy, Users } from "lucide-react";
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

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "-";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const statusTone = {
  upcoming: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  completed: "border-slate-600 bg-slate-800 text-slate-300",
  ended: "border-slate-600 bg-slate-800 text-slate-300"
};

const Competitions = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [competitions, setCompetitions] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [leaderboard, setLeaderboard] = useState(null);
  const [joiningId, setJoiningId] = useState("");
  const [actionError, setActionError] = useState("");

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      setError("");
      setActionError("");
      const response = await api.get("/api/competitions");
      const items = Array.isArray(response.data) ? response.data : [];
      setCompetitions(items);
      setSelectedId((current) => current || items[0]?._id || "");
    } catch (err) {
      setCompetitions([]);
      setLeaderboard(null);
      setError(getApiErrorMessage(err, "Failed to load competitions"));
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async (id) => {
    if (!id) {
      setLeaderboard(null);
      return;
    }

    try {
      setActionError("");
      const response = await api.get(`/api/competitions/${id}/leaderboard`);
      setLeaderboard(response.data || null);
    } catch (err) {
      setLeaderboard(null);
      setActionError(getApiErrorMessage(err, "Failed to load competition ranking"));
    }
  };

  useEffect(() => {
    loadCompetitions();
  }, []);

  useEffect(() => {
    loadLeaderboard(selectedId);
  }, [selectedId]);

  const joinCompetition = async (id) => {
    try {
      setJoiningId(id);
      setActionError("");
      await api.post(`/api/competitions/join/${id}`);
      await loadCompetitions();
      setSelectedId(id);
      await loadLeaderboard(id);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Failed to join competition"));
    } finally {
      setJoiningId("");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Trading Competitions" subtitle="Join competitions with separate virtual balances." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <GlassPanel key={index}><Skeleton className="h-40 w-full" /></GlassPanel>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Trading Competitions" subtitle="Join competitions with separate virtual balances." />
        <GlassPanel className="border-red-500/30 bg-red-500/10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-200">
                <CircleAlert className="h-5 w-5" />
                <h3 className="text-sm font-semibold uppercase">Competitions unavailable</h3>
              </div>
              <p className="mt-3 text-sm text-red-100/90">{error}</p>
            </div>
            <button
              type="button"
              onClick={loadCompetitions}
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
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Trading Competitions"
        subtitle="Competition balances and rankings are separate from your main trading account."
      />

      {actionError ? (
        <GlassPanel className="border-red-500/30 bg-red-500/10 text-sm text-red-100">
          {actionError}
        </GlassPanel>
      ) : null}

      {competitions.length === 0 ? (
        <GlassPanel>
          <div className="rounded-lg border border-dashed border-borderGlow bg-base px-4 py-10 text-center text-sm text-slate-400">
            No competitions are available.
          </div>
        </GlassPanel>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {competitions.map((competition) => (
            <GlassPanel key={competition._id} className={selectedId === competition._id ? "border-cyan/40" : ""}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{competition.name}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                    {competition.description || "Separate-balance trading challenge."}
                  </p>
                </div>
                <span className={`rounded-lg border px-3 py-1 text-xs font-semibold capitalize ${statusTone[competition.status] || statusTone.upcoming}`}>
                  {competition.status}
                </span>
              </div>

              <div className="mt-5 grid gap-3 text-xs text-slate-400">
                <span>Starts {formatDate(competition.startDate)}</span>
                <span>Ends {formatDate(competition.endDate)}</span>
                <span>Starting balance {formatCurrency(competition.startingBalance)}</span>
                <span>{competition.participantCount} participants</span>
              </div>

              {competition.isJoined ? (
                <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                  Joined with balance {formatCurrency(competition.participantBalance)}
                </div>
              ) : (
                <button
                  type="button"
                  disabled={joiningId === competition._id || competition.status === "completed" || competition.status === "ended"}
                  onClick={() => joinCompetition(competition._id)}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Users className="h-4 w-4" />
                  {joiningId === competition._id ? "Joining..." : "Join Competition"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedId(competition._id)}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-borderGlow bg-base px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan/40 hover:text-cyan"
              >
                <Trophy className="h-4 w-4" />
                View Ranking
              </button>
            </GlassPanel>
          ))}
        </div>
      )}

      {selectedId ? (
        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Competition ranking</p>
              <h3 className="mt-2 text-lg font-semibold text-white">{leaderboard?.competition?.name || "Selected competition"}</h3>
            </div>
            {leaderboard?.currentUser ? (
              <span className="rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm text-cyan">
                Your rank #{leaderboard.currentUser.rank}
              </span>
            ) : null}
          </div>

          <div className="mt-6 overflow-x-auto">
            {!leaderboard?.rows?.length ? (
              <div className="rounded-lg border border-dashed border-borderGlow bg-base px-4 py-10 text-center text-sm text-slate-400">
                No participants have joined this competition yet.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-borderGlow text-sm">
                <thead className="bg-slate-900/40 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Rank</th>
                    <th className="px-4 py-3 text-left">Trader</th>
                    <th className="px-4 py-3 text-right">Competition Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderGlow">
                  {leaderboard.rows.map((row) => (
                    <tr key={`${row.rank}-${row.name}`} className={row.isCurrentUser ? "bg-cyan/10" : "bg-panel"}>
                      <td className="px-4 py-4 font-semibold text-white">#{row.rank}</td>
                      <td className="px-4 py-4 text-slate-200">{row.name}</td>
                      <td className="px-4 py-4 text-right font-mono text-slate-200">{formatCurrency(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
};

export default Competitions;
