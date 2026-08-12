import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
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
      )
      .sort((left, right) => left.time - right.time);
  }
  if (!payload.t || !payload.c) return [];
    return payload.t.map((timestamp, index) => ({
    time: Number(timestamp),
    open: Number(payload.o[index]),
    high: Number(payload.h[index]),
    low: Number(payload.l[index]),
    close: Number(payload.c[index]),
    volume: Number(payload.v?.[index]) || 0
  })).filter((item) =>
    Number.isFinite(item.time) &&
    Number.isFinite(item.open) &&
    Number.isFinite(item.high) &&
    Number.isFinite(item.low) &&
    Number.isFinite(item.close)
  ).sort((left, right) => left.time - right.time);
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
  const [candles, setCandles] = useState([]);
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
        setCandles(formatCandles(historyPayload));
        setHistoryMeta({
          range: historyPayload.range,
          interval: historyPayload.interval,
          cached: Boolean(historyPayload.cached),
          stale: Boolean(historyPayload.stale),
          fetchedAt: historyPayload.fetchedAt
        });
      } else {
        setCandles([]);
        setHistoryMeta(null);
        setHistoryError(getApiErrorMessage(historyResult.reason, "Chart history is unavailable"));
      }
    } finally {
      setLoading(false);
    }
  }, [normalizedSymbol, period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const liveQuote = livePrices[normalizedSymbol];
    if (!liveQuote) return;
    setQuote((current) => ({ ...(current || {}), ...liveQuote }));
  }, [livePrices, normalizedSymbol]);

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
    candles,
    historyMeta,
    changePct,
    refresh
  };
};

export default useStockDetail;
