const { getQuote, ensureNseSymbol } = require("../utils/market");
const { getMarketSession } = require("./marketSessionService");

const PRICE_SOURCE = "market-provider";
const LIVE_POLL_MS = 15000;
const CLOSED_POLL_MS = 60000;

const normalizeLiveQuote = (symbol, quote) => {
  const normalizedSymbol = ensureNseSymbol(symbol);
  const price = Number(quote?.c);
  const previousClose = Number(quote?.pc);
  const hasPrice = Number.isFinite(price) && price > 0;
  const hasPreviousClose = Number.isFinite(previousClose) && previousClose > 0;
  const change = Number.isFinite(Number(quote?.change))
    ? Number(quote.change)
    : hasPrice && hasPreviousClose
      ? price - previousClose
      : null;
  const changePercent = Number.isFinite(Number(quote?.changePercent))
    ? Number(quote.changePercent)
    : Number.isFinite(change) && hasPreviousClose
      ? (change / previousClose) * 100
      : null;

  if (!hasPrice) {
    return {
      symbol: normalizedSymbol,
      price: null,
      c: null,
      previousClose: hasPreviousClose ? previousClose : null,
      pc: hasPreviousClose ? previousClose : null,
      change,
      changePercent,
      timestamp: quote?.t || Math.floor(Date.now() / 1000),
      fetchedAt: quote?.fetchedAt || null,
      source: PRICE_SOURCE,
      cached: Boolean(quote?.cached),
      stale: true,
      unavailable: true,
      status: "unavailable"
    };
  }

  return {
    symbol: normalizedSymbol,
    price,
    c: price,
    previousClose: hasPreviousClose ? previousClose : null,
    pc: hasPreviousClose ? previousClose : null,
    open: Number.isFinite(Number(quote?.o)) ? Number(quote.o) : null,
    high: Number.isFinite(Number(quote?.h)) ? Number(quote.h) : null,
    low: Number.isFinite(Number(quote?.l)) ? Number(quote.l) : null,
    volume: Number.isFinite(Number(quote?.v)) ? Number(quote.v) : null,
    change,
    changePercent,
    timestamp: quote?.t || Math.floor(new Date(quote?.fetchedAt || Date.now()).getTime() / 1000),
    fetchedAt: quote?.fetchedAt || new Date().toISOString(),
    source: PRICE_SOURCE,
    cached: Boolean(quote?.cached),
    stale: Boolean(quote?.stale),
    unavailable: false,
    marketState: quote?.marketState || null,
    tradingStatus: quote?.tradingStatus || quote?.marketState || null,
    dayHigh: Number.isFinite(Number(quote?.dayHigh ?? quote?.h)) ? Number(quote?.dayHigh ?? quote?.h) : null,
    dayLow: Number.isFinite(Number(quote?.dayLow ?? quote?.l)) ? Number(quote?.dayLow ?? quote?.l) : null,
    upperCircuit: Number.isFinite(Number(quote?.upperCircuit)) ? Number(quote.upperCircuit) : null,
    lowerCircuit: Number.isFinite(Number(quote?.lowerCircuit)) ? Number(quote.lowerCircuit) : null,
    status: quote?.stale ? "stale" : quote?.cached ? "cached" : "fresh"
  };
};

const fetchLiveQuotes = async (symbols = []) => {
  const uniqueSymbols = [...new Set(symbols.map((symbol) => ensureNseSymbol(symbol)).filter(Boolean))];
  const marketSession = getMarketSession();
  const results = await Promise.all(
    uniqueSymbols.map(async (symbol) => {
      try {
        return normalizeLiveQuote(symbol, await getQuote(symbol));
      } catch (error) {
        return normalizeLiveQuote(symbol, null);
      }
    })
  );

  return {
    marketSession,
    nextPollMs: marketSession.open ? LIVE_POLL_MS : CLOSED_POLL_MS,
    quotes: results
  };
};

module.exports = {
  LIVE_POLL_MS,
  CLOSED_POLL_MS,
  fetchLiveQuotes,
  normalizeLiveQuote
};
