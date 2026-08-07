import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";
import useLivePrices from "./useLivePrices";

const formatCandles = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.candles)) {
    return payload.candles
      .map((item) => ({
        time: Number(item.time),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume) || 0
      }))
      .filter((item) =>
        Number.isFinite(item.time) &&
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close)
      );
  }
  if (!payload.t || !payload.c) return [];
  return payload.t.map((timestamp, index) => ({
    time: Number(timestamp),
    open: Number(payload.o[index]),
    high: Number(payload.h[index]),
    low: Number(payload.l[index]),
    close: Number(payload.c[index]),
    volume: Number(payload.v?.[index]) || 0
  }));
};

const ensureNseSuffix = (value) => {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.endsWith(".NS") ? normalized : `${normalized}.NS`;
};

const useStockDetail = (symbol, period) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(null);
  const [profile, setProfile] = useState(null);
  const [signal, setSignal] = useState(null);
  const [candles, setCandles] = useState([]);
  const [marketDepth, setMarketDepth] = useState(null);
  const [depthLoading, setDepthLoading] = useState(true);
  const [depthError, setDepthError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [historyMeta, setHistoryMeta] = useState(null);

  const normalizedSymbol = useMemo(() => ensureNseSuffix(symbol), [symbol]);
  const livePrices = useLivePrices(normalizedSymbol ? [normalizedSymbol] : []);

  const refresh = useCallback(async () => {
    if (!normalizedSymbol) return;
    try {
      setLoading(true);
      setError("");
      setHistoryError("");
      const [stockResult, historyResult] = await Promise.allSettled([
        api.get(`/api/stocks/${encodeURIComponent(normalizedSymbol)}`),
        api.get(`/api/stocks/${encodeURIComponent(normalizedSymbol)}/history`, { params: { period } })
      ]);

      if (stockResult.status === "fulfilled") {
        setQuote(stockResult.value.data.quote || null);
        setProfile(stockResult.value.data.profile || null);
      } else {
        setQuote(null);
        setProfile(null);
        setError(getApiErrorMessage(stockResult.reason, "Failed to load stock quote"));
      }

      if (historyResult.status === "fulfilled") {
        const historyPayload = historyResult.value.data || {};
        setSignal(historyPayload.signal || null);
        setCandles(formatCandles(historyPayload));
        setHistoryMeta({
          range: historyPayload.range,
          interval: historyPayload.interval,
          cached: Boolean(historyPayload.cached),
          stale: Boolean(historyPayload.stale),
          fetchedAt: historyPayload.fetchedAt
        });
      } else {
        setSignal(null);
        setCandles([]);
        setHistoryMeta(null);
        setHistoryError(getApiErrorMessage(historyResult.reason, "Chart history is unavailable"));
      }
    } finally {
      setLoading(false);
    }
  }, [normalizedSymbol, period]);

  const refreshDepth = useCallback(async () => {
    if (!normalizedSymbol) return;
    try {
      setDepthLoading(true);
      setDepthError("");
      const response = await api.get(`/api/market-depth/${encodeURIComponent(normalizedSymbol)}`);
      setMarketDepth(response.data || null);
    } catch (err) {
      setDepthError(getApiErrorMessage(err, "Failed to load market depth"));
    } finally {
      setDepthLoading(false);
    }
  }, [normalizedSymbol]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshDepth();
  }, [refreshDepth]);

  useEffect(() => {
    if (!normalizedSymbol) return undefined;

    const handleDepthUpdate = (payload) => {
      if (!payload?.symbol || payload.symbol.toUpperCase() === normalizedSymbol) {
        refreshDepth();
      }
    };

    socket.on("market-depth:update", handleDepthUpdate);
    socket.on("orders:update", handleDepthUpdate);

    return () => {
      socket.off("market-depth:update", handleDepthUpdate);
      socket.off("orders:update", handleDepthUpdate);
    };
  }, [refreshDepth, normalizedSymbol]);

  useEffect(() => {
    const liveQuote = livePrices[normalizedSymbol];
    if (!liveQuote) return;
    setQuote((current) => ({ ...(current || {}), ...liveQuote }));
    refreshDepth();
  }, [livePrices, normalizedSymbol, refreshDepth]);

  useEffect(() => {
    if (!normalizedSymbol) return undefined;

    const timer = window.setInterval(() => {
      refreshDepth();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refreshDepth, normalizedSymbol]);

  const changePct = useMemo(() => {
    if (!quote || !Number.isFinite(quote.c) || !Number.isFinite(quote.pc) || quote.pc === 0) return NaN;
    return ((quote.c - quote.pc) / quote.pc) * 100;
  }, [quote]);

  return {
    loading,
    error,
    historyError,
    quote,
    profile,
    signal,
    candles,
    marketDepth,
    depthLoading,
    depthError,
    historyMeta,
    changePct,
    refresh,
    refreshDepth
  };
};

export default useStockDetail;
