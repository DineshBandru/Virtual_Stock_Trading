import { useEffect, useRef } from "react";
import socket from "../utils/socket";
import useToast from "./useToast";

const formatCurrency = (value) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value))
    : "";

const useTradingNotifications = (enabled = true) => {
  const { push } = useToast();
  const seenEvents = useRef(new Set());

  useEffect(() => {
    if (!enabled) return undefined;
    if (!socket.connected) {
      socket.connect();
    }

    const notifyOnce = (id, message, tone = "info") => {
      if (!id || seenEvents.current.has(id)) return;
      seenEvents.current.add(id);
      push(message, tone, { id });
    };

    const handleAlert = (payload = {}) => {
      notifyOnce(
        `alert:${payload.alertId}:${payload.triggeredAt}`,
        `Alert triggered: ${payload.symbol} ${payload.condition} ${formatCurrency(payload.targetPrice)} at ${formatCurrency(payload.triggeredPrice)}`,
        "success"
      );
    };

    const handleExecuted = (payload = {}) => {
      notifyOnce(
        payload.eventId || `order:${payload.orderId}:Executed`,
        `${payload.side} ${payload.symbol} x ${payload.quantity} executed${payload.price ? ` at ${formatCurrency(payload.price)}` : ""}`,
        "success"
      );
    };

    const handleRejected = (payload = {}) => {
      notifyOnce(
        payload.eventId || `order:${payload.orderId}:Rejected`,
        `${payload.side} ${payload.symbol} order rejected${payload.reason ? `: ${payload.reason}` : ""}`,
        "error"
      );
    };

    const handleCancelled = (payload = {}) => {
      notifyOnce(
        payload.eventId || `order:${payload.orderId}:Cancelled`,
        `${payload.symbol} order cancelled`,
        "info"
      );
    };

    const handleTriggered = (payload = {}) => {
      notifyOnce(
        payload.eventId || `order:${payload.orderId}:Triggered`,
        `${payload.orderType} ${payload.symbol} order triggered`,
        "info"
      );
    };

    socket.on("alert-triggered", handleAlert);
    socket.on("order-executed", handleExecuted);
    socket.on("order-rejected", handleRejected);
    socket.on("order-cancelled", handleCancelled);
    socket.on("order-triggered", handleTriggered);

    return () => {
      socket.off("alert-triggered", handleAlert);
      socket.off("order-executed", handleExecuted);
      socket.off("order-rejected", handleRejected);
      socket.off("order-cancelled", handleCancelled);
      socket.off("order-triggered", handleTriggered);
    };
  }, [enabled, push]);
};

export default useTradingNotifications;
