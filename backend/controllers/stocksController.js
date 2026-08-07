const {
  getQuote,
  getProfile,
  getHistory,
  ensureNseSymbol
} = require("../utils/market");
const { getSignal } = require("../utils/aiSignal");
const { findActiveInstrument, searchInstruments } = require("../services/instrumentService");

const HISTORY_RANGES = {
  "1D": { days: 7, interval: "5m", latestSessionOnly: true },
  "5D": { days: 10, interval: "15m" },
  "1W": { days: 10, interval: "15m" },
  "1M": { days: 30, interval: "1d" },
  "3M": { days: 90, interval: "1d" },
  "6M": { days: 182, interval: "1d" },
  "1Y": { days: 365, interval: "1d" },
  "5Y": { days: 365 * 5, interval: "1wk" }
};

const TRENDING_NSE = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "SBIN.NS", name: "State Bank of India" },
  { symbol: "ITC.NS", name: "ITC" },
  { symbol: "LT.NS", name: "Larsen and Toubro" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever" },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies" },
  { symbol: "AXISBANK.NS", name: "Axis Bank" },
  { symbol: "WIPRO.NS", name: "Wipro" },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharma" },
  { symbol: "TITAN.NS", name: "Titan" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki" }
];

const searchStocks = async (req, res, next) => {
  try {
    const query = String(req.query.q || "").trim();
    if (!query) {
      return res.status(400).json({ message: "Missing query" });
    }
    if (query.length < 2) {
      return res.json({ count: 0, result: [] });
    }
    const results = await searchInstruments(query, 15);
    return res.json({ count: results.length, result: results });
  } catch (err) {
    return next(err);
  }
};

const getStock = async (req, res, next) => {
  try {
    const symbol = ensureNseSymbol(req.params.symbol);
    const instrument = await findActiveInstrument(symbol);
    if (!instrument) {
      return res.status(404).json({ message: "Unsupported NSE equity symbol" });
    }
    const [quote, profile] = await Promise.all([
      getQuote(symbol),
      getProfile(symbol)
    ]);
    return res.json({ symbol, quote, profile });
  } catch (err) {
    return next(err);
  }
};

const getHistoryByPeriod = async (req, res, next) => {
  try {
    const symbol = ensureNseSymbol(req.params.symbol);
    const instrument = await findActiveInstrument(symbol);
    if (!instrument) {
      return res.status(404).json({ message: "Unsupported NSE equity symbol" });
    }
    const range = String(req.query.period || req.query.range || "1M").trim().toUpperCase();
    const config = HISTORY_RANGES[range];
    if (!config) {
      return res.status(400).json({ message: "Unsupported history range" });
    }

    const period2 = new Date();
    const period1 = new Date(period2.getTime() - config.days * 24 * 60 * 60 * 1000);
    const data = await getHistory(symbol, {
      range,
      interval: config.interval,
      period1,
      period2
    });
    if (config.latestSessionOnly && data.candles.length > 0) {
      const getNseDateKey = (timestamp) =>
        new Date(timestamp * 1000).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const latestDateKey = getNseDateKey(data.candles[data.candles.length - 1].time);
      data.candles = data.candles.filter((item) => getNseDateKey(item.time) === latestDateKey);
    }
    const closes = data.candles.map((item) => item.close);
    const signal = closes.length >= 15 ? getSignal(closes.slice(-30)) : null;

    return res.json({ ...data, signal });
  } catch (err) {
    return next(err);
  }
};

const getTrending = async (req, res, next) => {
  try {
    const quotes = await Promise.all(
      TRENDING_NSE.map((item) => getQuote(item.symbol))
    );
    const payload = TRENDING_NSE.map((item, index) => ({
      symbol: item.symbol,
      name: item.name,
      quote: quotes[index]
    }));
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
};

module.exports = { searchStocks, getStock, getHistoryByPeriod, getTrending };
