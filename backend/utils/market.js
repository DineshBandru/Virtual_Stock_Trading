const YahooFinance = require("yahoo-finance2").default;
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const quoteCache = new Map();
const historyCache = new Map();
const QUOTE_TTL_MS = 30 * 1000;
const QUOTE_STALE_TTL_MS = 5 * 60 * 1000;
const HISTORY_TTL_MS = 15 * 60 * 1000;
const HISTORY_STALE_TTL_MS = 60 * 60 * 1000;

const ensureNseSymbol = (symbol) => {
  if (!symbol) return symbol;
  const upper = symbol.toUpperCase();
  return upper.endsWith(".NS") ? upper : `${upper}.NS`;
};

const getCached = (cache, key, ttlMs) => {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > ttlMs) return null;
  return cached;
};

const cloneWithCacheMeta = (payload, cached, stale = false) => ({
  ...payload,
  cached,
  stale,
  fetchedAt: payload.fetchedAt,
  cachedAt: payload.cachedAt
});

const getQuote = async (symbol) => {
  const normalizedSymbol = ensureNseSymbol(symbol);
  const fresh = getCached(quoteCache, normalizedSymbol, QUOTE_TTL_MS);
  if (fresh) return cloneWithCacheMeta(fresh.payload, true, false);

  try {
    const data = await yahooFinance.quote(normalizedSymbol);
    const fetchedAt = new Date().toISOString();
    const quote = {
      symbol: normalizedSymbol,
      c: data?.regularMarketPrice,
      pc: data?.regularMarketPreviousClose,
      o: data?.regularMarketOpen,
      h: data?.regularMarketDayHigh,
      l: data?.regularMarketDayLow,
      v: data?.regularMarketVolume,
      change: data?.regularMarketChange,
      changePercent: data?.regularMarketChangePercent,
      dayHigh: data?.regularMarketDayHigh,
      dayLow: data?.regularMarketDayLow,
      upperCircuit: data?.upperLimitPrice,
      lowerCircuit: data?.lowerLimitPrice,
      tradingStatus: data?.marketState,
      marketState: data?.marketState,
      exchangeName: data?.fullExchangeName || data?.exchangeName,
      t: data?.regularMarketTime
        ? Math.floor(new Date(data.regularMarketTime).getTime() / 1000)
        : undefined,
      fetchedAt,
      cachedAt: fetchedAt,
      cached: false,
      stale: false
    };
    quoteCache.set(normalizedSymbol, { payload: quote, cachedAt: Date.now() });
    return quote;
  } catch (error) {
    const stale = getCached(quoteCache, normalizedSymbol, QUOTE_STALE_TTL_MS);
    if (stale) return cloneWithCacheMeta(stale.payload, true, true);
    throw error;
  }
};

const getProfile = async (symbol) => {
  const data = await yahooFinance.quoteSummary(ensureNseSymbol(symbol), {
    modules: ["price", "summaryProfile"]
  });

  return {
    name: data?.price?.longName || data?.price?.shortName || "",
    finnhubIndustry: data?.summaryProfile?.sector || "",
    marketCapitalization: data?.price?.marketCap
      ? data.price.marketCap / 1000000000
      : undefined,
    peRatio: data?.price?.trailingPE
  };
};

const normalizeTimestamp = (value) => {
  if (value instanceof Date) return Math.floor(value.getTime() / 1000);
  if (typeof value === "number") return value > 100000000000 ? Math.floor(value / 1000) : Math.floor(value);
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : null;
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeCandles = (result) => {
  const timestampRows = Array.isArray(result?.timestamp)
    ? result.timestamp.map((time, index) => ({
        time,
        open: result?.indicators?.quote?.[0]?.open?.[index],
        high: result?.indicators?.quote?.[0]?.high?.[index],
        low: result?.indicators?.quote?.[0]?.low?.[index],
        close: result?.indicators?.quote?.[0]?.close?.[index],
        volume: result?.indicators?.quote?.[0]?.volume?.[index]
      }))
    : [];
  const quoteRows = Array.isArray(result?.quotes) ? result.quotes : [];
  const rows = timestampRows.length > 0 ? timestampRows : quoteRows;
  const seen = new Set();

  return rows
    .map((row) => {
      const time = normalizeTimestamp(row.time ?? row.date);
      const open = toFiniteNumber(row.open);
      const high = toFiniteNumber(row.high);
      const low = toFiniteNumber(row.low);
      const close = toFiniteNumber(row.close);
      const volume = toFiniteNumber(row.volume);
      return { time, open, high, low, close, volume: volume ?? 0 };
    })
    .filter((row) =>
      Number.isFinite(row.time) &&
      Number.isFinite(row.open) &&
      Number.isFinite(row.high) &&
      Number.isFinite(row.low) &&
      Number.isFinite(row.close)
    )
    .sort((left, right) => left.time - right.time)
    .filter((row) => {
      if (seen.has(row.time)) return false;
      seen.add(row.time);
      return true;
    });
};

const getHistory = async (symbol, { range, interval, period1, period2, providerRange }) => {
  const normalizedSymbol = ensureNseSymbol(symbol);
  const cacheKey = `${normalizedSymbol}:${range}:${interval}`;
  const fresh = getCached(historyCache, cacheKey, HISTORY_TTL_MS);
  if (fresh) return { ...fresh.payload, cached: true, stale: false };

  try {
    const chartOptions = providerRange
      ? { range: providerRange, interval }
      : { period1, period2, interval };
    const result = await yahooFinance.chart(normalizedSymbol, chartOptions);
    const candles = normalizeCandles(result);
    const fetchedAt = new Date().toISOString();
    const payload = {
      symbol: normalizedSymbol,
      range,
      interval,
      candles,
      cached: false,
      stale: false,
      fetchedAt,
      cachedAt: fetchedAt
    };
    historyCache.set(cacheKey, { payload, cachedAt: Date.now() });
    return payload;
  } catch (error) {
    const stale = getCached(historyCache, cacheKey, HISTORY_STALE_TTL_MS);
    if (stale) return { ...stale.payload, cached: true, stale: true };
    throw error;
  }
};

module.exports = { getQuote, getProfile, getHistory, ensureNseSymbol };
