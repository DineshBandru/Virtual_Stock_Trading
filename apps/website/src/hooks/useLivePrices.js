import { useEffect, useMemo, useRef, useState } from "react";
import socket from "../utils/socket";

const normalizeSymbols = (symbols = []) =>
  [...new Set(
    symbols
      .map((symbol) => String(symbol || "").trim().toUpperCase())
      .filter(Boolean)
      .map((symbol) => (symbol.endsWith(".NS") ? symbol : `${symbol}.NS`))
  )].sort();

const getQuoteTime = (quote) => {
  if (Number.isFinite(Number(quote?.timestamp))) return Number(quote.timestamp) * 1000;
  const parsed = new Date(quote?.fetchedAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const useLivePrices = (symbols = []) => {
  const [prices, setPrices] = useState({});
  const subscribedSymbols = useMemo(() => normalizeSymbols(symbols), [symbols]);
  const subscribedKey = subscribedSymbols.join("|");
  const subscribedRef = useRef([]);

  useEffect(() => {
    subscribedRef.current = subscribedSymbols;
  }, [subscribedSymbols]);

  useEffect(() => {
    const mergeQuote = (quote) => {
      if (!quote?.symbol) return;
      const symbol = String(quote.symbol).toUpperCase();
      setPrices((current) => {
        const existing = current[symbol];
        if (existing && getQuoteTime(existing) > getQuoteTime(quote)) {
          return current;
        }
        return { ...current, [symbol]: quote };
      });
    };

    const handleQuoteUpdate = (quote) => mergeQuote(quote);

    const handlePricesUpdate = (payload) => {
      Object.values(payload || {}).forEach(mergeQuote);
    };

    const handleConnect = () => {
      if (subscribedRef.current.length > 0) {
        socket.emit("subscribe-symbols", subscribedRef.current);
      }
    };

    socket.on("quote-update", handleQuoteUpdate);
    socket.on("prices:update", handlePricesUpdate);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("quote-update", handleQuoteUpdate);
      socket.off("prices:update", handlePricesUpdate);
      socket.off("connect", handleConnect);
    };
  }, []);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    if (subscribedSymbols.length > 0) {
      socket.emit("subscribe-symbols", subscribedSymbols);
    }

    return () => {
      if (subscribedSymbols.length > 0) {
        socket.emit("unsubscribe-symbols", subscribedSymbols);
      }
    };
  }, [subscribedKey]);

  return prices;
};

export default useLivePrices;
