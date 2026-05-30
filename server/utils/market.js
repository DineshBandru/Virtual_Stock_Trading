const yahooFinance = require("yahoo-finance2").default;

const ensureNseSymbol = (symbol) => {
  if (!symbol) return symbol;
  const upper = symbol.toUpperCase();
  return upper.endsWith(".NS") ? upper : `${upper}.NS`;
};

const getQuote = async (symbol) => {
  const data = await yahooFinance.quote(ensureNseSymbol(symbol));
  return {
    c: data?.regularMarketPrice,
    pc: data?.regularMarketPreviousClose,
    o: data?.regularMarketOpen,
    h: data?.regularMarketDayHigh,
    l: data?.regularMarketDayLow,
    t: data?.regularMarketTime
      ? Math.floor(new Date(data.regularMarketTime).getTime() / 1000)
      : undefined
  };
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

const resolutionToInterval = (resolution) => {
  if (resolution === "15") return "15m";
  if (resolution === "60") return "1h";
  return "1d";
};

const getHistory = async (symbol, resolution, from, to) => {
  const result = await yahooFinance.chart(ensureNseSymbol(symbol), {
    period1: from,
    period2: to,
    interval: resolutionToInterval(resolution)
  });

  const timestamps = result?.timestamp || [];
  const quote = result?.indicators?.quote?.[0] || {};

  return {
    t: timestamps,
    o: quote.open || [],
    h: quote.high || [],
    l: quote.low || [],
    c: quote.close || [],
    v: quote.volume || []
  };
};

module.exports = { getQuote, getProfile, getHistory, ensureNseSymbol };
