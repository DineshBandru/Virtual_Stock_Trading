import { useCallback, useEffect, useState } from "react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";
import useAlertsFeed from "../hooks/useAlertsFeed";
import useToast from "../hooks/useToast";
import { Skeleton } from "../components/Skeleton";

const Alerts = () => {
  const { user } = useAuth();
  const latestAlert = useAlertsFeed(user?.id);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { push } = useToast();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/alerts");
      setAlerts(response.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (latestAlert) {
      push(
        `Alert: ${latestAlert.symbol} ${latestAlert.condition} ₹${latestAlert.targetPrice}`,
        "success"
      );
    }
  }, [latestAlert, push]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Price Alerts"
        subtitle="Trigger notifications when a symbol crosses your threshold."
      />

      <GlassPanel>
        {latestAlert ? (
          <div className="mb-6 rounded-2xl border border-amber/60 bg-amber/10 px-4 py-3 text-xs text-amber">
            Alert triggered: {latestAlert.symbol} {latestAlert.condition} ₹
            {latestAlert.targetPrice}
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-red-300/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-100 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3"
              >
                <Skeleton className="h-3 w-1/3" />
                <div className="mt-3">
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <div className="mt-2">
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))
          ) : alerts.length === 0 ? (
            <div className="text-xs text-slate-400">
              Create alerts to receive live notifications.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert._id}
                className="rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {alert.symbol}
                </p>
                <p className="mt-2 text-sm text-white">
                  {alert.condition} ₹{alert.targetPrice}
                </p>
                <p className="text-xs text-slate-500">
                  {alert.triggered ? "Triggered" : "Active"}
                </p>
              </div>
            ))
          )}
        </div>
      </GlassPanel>
    </div>
  );
};

export default Alerts;
