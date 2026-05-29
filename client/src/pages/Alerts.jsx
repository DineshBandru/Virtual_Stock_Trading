import { useEffect, useState } from "react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import api from "../utils/api";
import useAuth from "../hooks/useAuth";
import useAlertsFeed from "../hooks/useAlertsFeed";
import useToast from "../hooks/useToast";

const Alerts = () => {
  const { user } = useAuth();
  const latestAlert = useAlertsFeed(user?.id);
  const [alerts, setAlerts] = useState([]);
  const { push } = useToast();

  useEffect(() => {
    const load = async () => {
      const response = await api.get("/api/alerts");
      setAlerts(response.data || []);
    };
    load();
  }, []);

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
        <div className="grid gap-4 md:grid-cols-2">
          {alerts.length === 0 ? (
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
