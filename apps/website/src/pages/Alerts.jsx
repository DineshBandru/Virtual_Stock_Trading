import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";
import useAlertsFeed from "../hooks/useAlertsFeed";
import useToast from "../hooks/useToast";
import { Skeleton } from "../components/Skeleton";
import { getApiErrorMessage } from "../utils/errorMessage";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const formatCurrency = (value) =>
  Number.isFinite(Number(value)) ? money.format(Number(value)) : "-";

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

const conditionLabel = {
  above: "Price above",
  below: "Price below"
};

const Alerts = () => {
  const { user } = useAuth();
  const latestAlert = useAlertsFeed(user?.id);
  const { push, pushToast } = useToast();
  const showToast = pushToast || push;

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [symbol, setSymbol] = useState("");
  const [condition, setCondition] = useState("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const loadAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/alerts");
      setAlerts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load alerts"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    if (latestAlert) {
      loadAlerts();
    }
  }, [latestAlert, loadAlerts]);

  useEffect(() => {
    const query = symbol.trim();

    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    setSearchLoading(true);
    setSearchError("");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/api/stocks/search", {
          params: { q: query },
          signal: controller.signal
        });
        setSearchResults(response.data?.result || []);
      } catch (err) {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          setSearchError(getApiErrorMessage(err, "Search failed"));
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [symbol]);

  const summary = useMemo(() => {
    return alerts.reduce(
      (acc, alert) => {
        acc.total += 1;
        if (alert.triggered) {
          acc.triggered += 1;
        } else {
          acc.active += 1;
        }
        return acc;
      },
      { total: 0, active: 0, triggered: 0 }
    );
  }, [alerts]);

  const handleCreate = async (event) => {
    event.preventDefault();
    const normalizedSymbol = symbol.trim().toUpperCase();
    const numericTarget = Number(targetPrice);

    if (!normalizedSymbol || !Number.isFinite(numericTarget) || numericTarget <= 0) {
      setError("Enter a valid symbol and target price");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const response = await api.post("/api/alerts", {
        symbol: normalizedSymbol,
        condition,
        targetPrice: numericTarget
      });
      setAlerts((current) => [response.data, ...current]);
      setSymbol("");
      setTargetPrice("");
      setSearchResults([]);
      showToast?.("Alert created", "success");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create alert"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (alertId) => {
    if (!alertId) return;

    try {
      setDeletingId(alertId);
      setError("");
      await api.delete(`/api/alerts/${alertId}`);
      setAlerts((current) => current.filter((alert) => alert._id !== alertId));
      showToast?.("Alert deleted", "success");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete alert"));
    } finally {
      setDeletingId("");
    }
  };

  const selectSearchResult = (result) => {
    if (!result?.symbol) return;
    setSymbol(result.symbol);
    setSearchResults([]);
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Price Alerts"
        subtitle="Create stock thresholds and get notified when symbols cross your target."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total Alerts", value: summary.total },
          { label: "Active", value: summary.active },
          { label: "Triggered", value: summary.triggered }
        ].map((item) => (
          <GlassPanel key={item.label}>
            <p className="text-[11px] uppercase text-[#A1A1B5]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
          </GlassPanel>
        ))}
      </div>

      {latestAlert ? (
        <div className="rounded-2xl border border-white/10 bg-[#1A1B2B] px-4 py-3 text-sm text-[#E7E9F3]">
          Alert triggered: {latestAlert.symbol} {conditionLabel[latestAlert.condition] || latestAlert.condition}{" "}
          {formatCurrency(latestAlert.targetPrice)}
          {Number.isFinite(Number(latestAlert.triggeredPrice))
            ? ` at ${formatCurrency(latestAlert.triggeredPrice)}`
            : ""}
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadAlerts}
            className="rounded-2xl border border-red-300/60 px-4 py-2 text-xs font-semibold uppercase text-red-100 transition hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <GlassPanel>
          <p className="text-xs uppercase text-[#A1A1B5]">Create Alert</p>
          <h3 className="mt-2 text-lg font-semibold text-white">New price trigger</h3>

          <form onSubmit={handleCreate} className="mt-6 space-y-5">
            <label className="block text-[11px] uppercase text-[#A1A1B5]">
              Stock Symbol
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7487]" />
                <input
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="RELIANCE.NS"
                  className="w-full rounded-2xl border border-white/10 bg-[#080910] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#6F7487] focus:border-cyan"
                />
              </div>
            </label>

            {searchLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-2xl" />
              </div>
            ) : searchError ? (
              <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                {searchError}
              </p>
            ) : searchResults.length > 0 ? (
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {searchResults.slice(0, 5).map((result) => (
                  <button
                    key={`${result.symbol}-${result.description}`}
                    type="button"
                    onClick={() => selectSearchResult(result)}
                    className="w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-left transition hover:border-cyan/40 hover:bg-cyan/10"
                  >
                    <p className="font-mono text-sm font-semibold text-white">{result.symbol}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-[#A1A1B5]">{result.description}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <label className="block text-[11px] uppercase text-[#A1A1B5]">
              Condition
              <select
                value={condition}
                onChange={(event) => setCondition(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan"
              >
                <option value="above">Price above</option>
                <option value="below">Price below</option>
              </select>
            </label>

            <label className="block text-[11px] uppercase text-[#A1A1B5]">
              Target Price
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                placeholder="2500.00"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6F7487] focus:border-cyan"
              />
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Alert
            </button>
          </form>
        </GlassPanel>

        <GlassPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-[#A1A1B5]">Alert List</p>
              <h3 className="mt-2 text-lg font-semibold text-white">Your price alerts</h3>
            </div>
            <button
              type="button"
              onClick={loadAlerts}
              className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-4"
                >
                  <Skeleton className="h-3 w-1/3" />
                  <div className="mt-3">
                    <Skeleton className="h-5 w-2/3" />
                  </div>
                  <div className="mt-3">
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))
            ) : alerts.length === 0 ? (
              <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 bg-[#080910] px-4 py-12 text-center text-sm text-[#A1A1B5]">
                <p className="font-semibold text-white">No price alerts yet.</p>
                <p className="mt-2">Create an alert to track when a stock reaches your target price.</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert._id}
                  className="rounded-2xl border border-white/10 bg-[#080910] p-4 transition hover:border-cyan/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-base font-semibold text-white">{alert.symbol}</p>
                      <p className="mt-1 text-sm text-[#C2C4D2]">
                        {conditionLabel[alert.condition] || alert.condition}{" "}
                        <span className="font-semibold text-white">{formatCurrency(alert.targetPrice)}</span>
                      </p>
                    </div>
                    <span
                      className={`rounded-2xl border px-3 py-1 text-xs font-semibold ${
                        alert.triggered
                          ? "border-white/10 bg-[#1A1B2B] text-[#C2C4D2]"
                          : "border-cyan/30 bg-cyan/10 text-cyan"
                      }`}
                    >
                      {alert.triggered ? "Triggered" : "Active"}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-[#6F7487]">
                      {alert.triggered
                        ? `Triggered ${formatDateTime(alert.triggeredAt)}${
                            Number.isFinite(Number(alert.triggeredPrice))
                              ? ` at ${formatCurrency(alert.triggeredPrice)}`
                              : ""
                          }`
                        : `Created ${formatDateTime(alert.createdAt)}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDelete(alert._id)}
                      disabled={deletingId === alert._id}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-500/40 px-3 py-2 text-xs font-semibold uppercase text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === alert._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Delete
                    </button>
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

export default Alerts;
