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

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getPeriodFallbackCount = (period) => {
  switch (String(period || "").toUpperCase()) {
    case "1D":
      return 24;
    case "1W":
      return 7;
    case "3M":
      return 45;
    case "6M":
      return 90;
    case "1Y":
      return 180;
    case "5Y":
      return 260;
    case "1M":
    default:
      return 30;
  }
};

const buildFallbackCandles = (quote, period) => {
  const current = toFiniteNumber(quote?.c);
  if (!Number.isFinite(current) || current <= 0) return [];

  const previousClose = toFiniteNumber(quote?.pc) || current;
  const open = toFiniteNumber(quote?.o) || previousClose;
  const dayHigh = toFiniteNumber(quote?.h ?? quote?.dayHigh) || Math.max(open, current);
  const dayLow = toFiniteNumber(quote?.l ?? quote?.dayLow) || Math.min(open, current);
  const volume = toFiniteNumber(quote?.v ?? quote?.volume) || 0;
  const count = getPeriodFallbackCount(period);
  const now = toFiniteNumber(quote?.t) || Math.floor(Date.now() / 1000);
  const step = String(period || "").toUpperCase() === "1D" ? 15 * 60 : 24 * 60 * 60;
  const startPrice = previousClose || current;
  const totalMove = current - startPrice;

  return Array.from({ length: count }, (_, index) => {
    const progress = count === 1 ? 1 : index / (count - 1);
    const close = startPrice + totalMove * progress;
    const candleOpen = index === 0 ? open : startPrice + totalMove * ((index - 1) / Math.max(1, count - 1));
    const wiggle = Math.max(current * 0.0015, Math.abs(totalMove) * 0.12, 0.5);
    return {
      time: now - (count - index - 1) * step,
      open: candleOpen,
      high: Math.max(candleOpen, close, dayHigh * (index === count - 1 ? 1 : 0.995)) + wiggle,
      low: Math.min(candleOpen, close, dayLow * (index === count - 1 ? 1 : 1.005)) - wiggle,
      close,
      volume: Math.round(volume / Math.max(1, count)) || 0,
      fallback: true
    };
  });
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

      const loadedQuote = stockResult.status === "fulfilled" ? stockResult.value.data.quote || null : null;

      if (stockResult.status === "fulfilled") {
        setQuote(loadedQuote);
        setProfile(stockResult.value.data.profile || null);
      } else {
        setQuote(null);
        setProfile(null);
        setError(getApiErrorMessage(stockResult.reason, "Failed to load stock quote"));
      }

      if (historyResult.status === "fulfilled") {
        const historyPayload = historyResult.value.data || {};
        const formattedCandles = formatCandles(historyPayload);
        setCandles(formattedCandles.length >= 2 ? formattedCandles : buildFallbackCandles(loadedQuote, period));
        setHistoryMeta({
          range: historyPayload.range,
          interval: historyPayload.interval,
          cached: Boolean(historyPayload.cached),
          stale: Boolean(historyPayload.stale),
          fetchedAt: historyPayload.fetchedAt,
          fallback: formattedCandles.length < 2
        });
      } else {
        setCandles(buildFallbackCandles(loadedQuote, period));
        setHistoryMeta({ fallback: true });
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
