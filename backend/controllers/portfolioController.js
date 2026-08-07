const Portfolio = require("../models/Portfolio");
const { getQuote } = require("../utils/market");
const { normalizeLiveQuote } = require("../services/liveMarketService");

const getPortfolio = async (req, res, next) => {
  try {
    const holdings = await Portfolio.find({ userId: req.user.id }).lean();
    const quotes = await Promise.all(
      holdings.map((item) => getQuote(item.symbol).catch(() => null))
    );

    const enriched = holdings.map((item, index) => {
      const quote = normalizeLiveQuote(item.symbol, quotes[index]);
      const quotePrice = Number(quote.price);
      const hasPrice = Number.isFinite(quotePrice) && quotePrice > 0;
      const currentPrice = hasPrice ? quotePrice : null;
      const currentValue = hasPrice ? currentPrice * item.quantity : null;
      const investedValue = Number(item.avgBuyPrice || 0) * Number(item.quantity || 0);
      const pnl = hasPrice ? currentValue - investedValue : null;
      const pnlPct = hasPrice && investedValue
        ? (pnl / investedValue) * 100
        : null;
      return {
        ...item,
        investedValue,
        totalInvested: investedValue,
        currentPrice,
        currentValue,
        pnl,
        pnlPct,
        valuationAvailable: hasPrice,
        quoteStale: Boolean(quote.stale),
        quoteStatus: quote.status,
        priceUpdatedAt: quote.fetchedAt,
        priceTimestamp: quote.timestamp,
        previousClose: quote.previousClose,
        change: quote.change,
        changePercent: quote.changePercent
      };
    });

    return res.json(enriched);
  } catch (err) {
    return next(err);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const holdings = await Portfolio.find({ userId: req.user.id }).lean();
    const quotes = await Promise.all(
      holdings.map((item) => getQuote(item.symbol).catch(() => null))
    );

    let invested = 0;
    let currentValue = 0;
    let valuationAvailable = true;
    let staleQuotes = false;
    const unavailableSymbols = [];

    holdings.forEach((item, index) => {
      const quote = normalizeLiveQuote(item.symbol, quotes[index]);
      invested += Number(item.avgBuyPrice || 0) * Number(item.quantity || 0);
      const price = Number(quote.price);
      staleQuotes = staleQuotes || Boolean(quote.stale);
      if (Number.isFinite(price) && price > 0) {
        currentValue += price * item.quantity;
      } else {
        valuationAvailable = false;
        unavailableSymbols.push(item.symbol);
      }
    });

    const pnl = valuationAvailable ? currentValue - invested : null;
    const pnlPct = valuationAvailable && invested ? (pnl / invested) * 100 : null;

    return res.json({
      invested,
      currentValue: valuationAvailable ? currentValue : null,
      pnl,
      pnlPct,
      valuationAvailable,
      staleQuotes,
      unavailableSymbols
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getPortfolio, getAnalytics };
