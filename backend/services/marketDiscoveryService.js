const YahooFinance = require("yahoo-finance2").default;
const Instrument = require("../models/Instrument");
const { getQuote, ensureNseSymbol } = require("../utils/market");
const { findActiveInstrument } = require("./instrumentService");

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const CACHE_TTL_MS = 60 * 1000;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
const discoveryCache = new Map();

const typeConfig = {
  gainers: { provider: "dailyGainers", sort: (left, right) => right.changePercent - left.changePercent },
  losers: { provider: "dailyLosers", sort: (left, right) => left.changePercent - right.changePercent },
  active: { provider: null, sort: (left, right) => right.volume - left.volume }
};

const normalizeLimit = (limit) => Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 5), MAX_LIMIT);

const isUsableQuote = (quote) =>
  Number.isFinite(Number(quote?.c)) &&
  Number(quote.c) > 0 &&
  Number.isFinite(Number(quote?.changePercent)) &&
  Number.isFinite(Number(quote?.v));

const normalizeMover = async (symbol, fallbackName = "") => {
  const normalizedSymbol = ensureNseSymbol(symbol);
  const instrument = await findActiveInstrument(normalizedSymbol);
  if (!instrument) return null;

  const quote = await getQuote(normalizedSymbol);
  if (!isUsableQuote(quote)) return null;

  return {
    symbol: instrument.symbol,
    tradingSymbol: instrument.tradingSymbol,
    companyName: instrument.companyName || fallbackName,
    currentPrice: Number(quote.c),
    change: Number(quote.change) || 0,
    changePercent: Number(quote.changePercent),
    volume: Number(quote.v),
    fetchedAt: quote.fetchedAt,
    cached: Boolean(quote.cached),
    stale: Boolean(quote.stale)
  };
};

const getProviderSymbols = async (type, limit) => {
  const providerMethod = typeConfig[type]?.provider;
  if (!providerMethod || typeof yahooFinance[providerMethod] !== "function") return [];

  const response = await yahooFinance[providerMethod]({ region: "IN", count: Math.max(limit * 3, 25) });
  const quotes = Array.isArray(response?.quotes) ? response.quotes : Array.isArray(response) ? response : [];
  return quotes
    .map((item) => ({
      symbol: ensureNseSymbol(item.symbol || item.ticker),
      name: item.shortName || item.longName || item.displayName || ""
    }))
    .filter((item) => item.symbol.endsWith(".NS"));
};

const getCatalogueSeedSymbols = async (limit) => {
  const instruments = await Instrument.find({
    active: true,
    exchange: "NSE",
    instrumentType: "EQUITY",
    series: "EQ"
  })
    .sort({ tradingSymbol: 1 })
    .limit(Math.max(limit * 4, 40))
    .select("symbol companyName")
    .lean();

  return instruments.map((item) => ({ symbol: item.symbol, name: item.companyName }));
};

const getMarketDiscovery = async ({ type = "gainers", limit = DEFAULT_LIMIT } = {}) => {
  const normalizedType = typeConfig[type] ? type : "gainers";
  const normalizedLimit = normalizeLimit(limit);
  const cacheKey = `${normalizedType}:${normalizedLimit}`;
  const cached = discoveryCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.payload, cached: true };
  }

  let source = "provider";
  let seeds = [];
  try {
    seeds = await getProviderSymbols(normalizedType, normalizedLimit);
  } catch (error) {
    source = "validated-catalogue-cache";
  }

  if (!seeds.length || normalizedType === "active") {
    source = normalizedType === "active" ? "validated-catalogue-cache" : source;
    seeds = await getCatalogueSeedSymbols(normalizedLimit);
  }

  const seen = new Set();
  const movers = [];
  for (const seed of seeds) {
    if (!seed.symbol || seen.has(seed.symbol)) continue;
    seen.add(seed.symbol);
    try {
      const mover = await normalizeMover(seed.symbol, seed.name);
      if (mover) movers.push(mover);
    } catch (error) {
      // Skip unusable provider rows; the response remains honest about source and count.
    }
  }

  const sorted = movers
    .sort(typeConfig[normalizedType].sort)
    .slice(0, normalizedLimit);

  const payload = {
    type: normalizedType,
    source,
    universe: source === "provider" ? "Yahoo Finance market movers filtered to active NSE equity instruments" : "Cached active NSE instrument catalogue sample",
    count: sorted.length,
    result: sorted,
    fetchedAt: new Date().toISOString(),
    cached: false
  };

  discoveryCache.set(cacheKey, { payload, cachedAt: Date.now() });
  return payload;
};

module.exports = {
  CACHE_TTL_MS,
  getMarketDiscovery,
  normalizeLimit
};
