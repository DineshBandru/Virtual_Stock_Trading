const YahooFinance = require("yahoo-finance2").default;
const {
  getQuote,
  getProfile,
  getHistory,
  ensureNseSymbol
} = require("../utils/market");
const { getSignal } = require("../utils/aiSignal");

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

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
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ message: "Missing query" });
    }
    const data = await yahooFinance.search(query);
    const results = (data?.quotes || []).slice(0, 10).map((item) => ({
      symbol: ensureNseSymbol(item.symbol || ""),
      description: item.shortname || item.longname || item.symbol
    }));
    return res.json({ count: results.length, result: results });
  } catch (err) {
    return next(err);
  }
};

const getStock = async (req, res, next) => {
  try {
    const symbol = req.params.symbol;
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
    const symbol = req.params.symbol;
    const period = req.query.period || "1M";

    const now = Math.floor(Date.now() / 1000);
    let from = now - 60 * 60 * 24 * 30;
    let resolution = "D";

    if (period === "1D") {
      from = now - 60 * 60 * 24;
      resolution = "15";
    } else if (period === "1W") {
      from = now - 60 * 60 * 24 * 7;
      resolution = "60";
    } else if (period === "3M") {
      from = now - 60 * 60 * 24 * 90;
    } else if (period === "6M") {
      from = now - 60 * 60 * 24 * 182;
    } else if (period === "1Y") {
      from = now - 60 * 60 * 24 * 365;
    } else if (period === "5Y") {
      from = now - 60 * 60 * 24 * 365 * 5;
    }

    const data = await getHistory(symbol, resolution, from, now);
    const closes = data && data.c ? data.c : [];
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
