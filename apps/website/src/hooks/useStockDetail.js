import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";

const formatCandles = (payload) => {
  if (!payload || !payload.t || !payload.c) return [];
  return payload.t.map((timestamp, index) => ({
    time: timestamp,
    open: payload.o[index],
    high: payload.h[index],
    low: payload.l[index],
    close: payload.c[index]
  }));
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

  const refresh = useCallback(async () => {
    if (!symbol) return;
    try {
      setLoading(true);
      setError("");
      const [stockRes, historyRes] = await Promise.all([
        api.get(`/api/stocks/${symbol}`),
        api.get(`/api/stocks/${symbol}/history`, { params: { period } })
      ]);
      setQuote(stockRes.data.quote || null);
      setProfile(stockRes.data.profile || null);
      setSignal(historyRes.data.signal || null);
      setCandles(formatCandles(historyRes.data));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load stock data"));
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  const refreshDepth = useCallback(async () => {
    if (!symbol) return;
    try {
      setDepthLoading(true);
      setDepthError("");
      const response = await api.get(`/api/market-depth/${symbol}`);
      setMarketDepth(response.data || null);
    } catch (err) {
      setDepthError(getApiErrorMessage(err, "Failed to load market depth"));
    } finally {
      setDepthLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    refreshDepth();
  }, [refreshDepth]);

  useEffect(() => {
    if (!symbol) return undefined;

    const normalizedSymbol = symbol.toUpperCase();

    const handleDepthUpdate = (payload) => {
      if (!payload?.symbol || payload.symbol.toUpperCase() === normalizedSymbol) {
        refreshDepth();
      }
    };

    const handlePriceUpdate = (payload) => {
      if (payload && payload[normalizedSymbol]) {
        refreshDepth();
      }
    };

    socket.on("market-depth:update", handleDepthUpdate);
    socket.on("orders:update", handleDepthUpdate);
    socket.on("prices:update", handlePriceUpdate);

    return () => {
      socket.off("market-depth:update", handleDepthUpdate);
      socket.off("orders:update", handleDepthUpdate);
      socket.off("prices:update", handlePriceUpdate);
    };
  }, [refreshDepth, symbol]);

  useEffect(() => {
    if (!symbol) return undefined;

    const timer = window.setInterval(() => {
      refreshDepth();
    }, 15000);

    return () => window.clearInterval(timer);
  }, [refreshDepth, symbol]);

  const changePct = useMemo(() => {
    if (!quote || quote.pc === 0) return 0;
    return ((quote.c - quote.pc) / quote.pc) * 100;
  }, [quote]);

  return {
    loading,
    error,
    quote,
    profile,
    signal,
    candles,
    marketDepth,
    depthLoading,
    depthError,
    changePct,
    refresh,
    refreshDepth
  };
};

export default useStockDetail;
