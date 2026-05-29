import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../utils/api";

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
      setError(err?.response?.data?.message || "Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }, [symbol, period]);

  useEffect(() => {
    refresh();
  }, [refresh]);

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
    changePct,
    refresh
  };
};

export default useStockDetail;
