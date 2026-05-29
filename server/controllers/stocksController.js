const { finnhubRequest } = require("../utils/finnhub");
const { getQuote, getProfile, getHistory } = require("../utils/market");
const { getSignal } = require("../utils/aiSignal");

const searchStocks = async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ message: "Missing query" });
    }
    const data = await finnhubRequest("/search", { q: query });
    return res.json(data);
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
    } else if (period === "1Y") {
      from = now - 60 * 60 * 24 * 365;
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
    const symbols = await finnhubRequest("/stock/symbol", { exchange: "US" });
    const top = symbols.slice(0, 15).map((item) => item.symbol);
    const quotes = await Promise.all(top.map((symbol) => getQuote(symbol)));
    const payload = top.map((symbol, index) => ({
      symbol,
      quote: quotes[index]
    }));
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
};

module.exports = { searchStocks, getStock, getHistoryByPeriod, getTrending };
