const Portfolio = require("../models/Portfolio");
const { getQuote } = require("../utils/market");

const getPortfolio = async (req, res, next) => {
  try {
    const holdings = await Portfolio.find({ userId: req.user.id }).lean();
    const quotes = await Promise.all(
      holdings.map((item) => getQuote(item.symbol))
    );

    const enriched = holdings.map((item, index) => {
      const currentPrice = quotes[index].c || 0;
      const currentValue = currentPrice * item.quantity;
      const pnl = currentValue - item.totalInvested;
      const pnlPct = item.totalInvested
        ? (pnl / item.totalInvested) * 100
        : 0;
      return {
        ...item,
        currentPrice,
        currentValue,
        pnl,
        pnlPct
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
      holdings.map((item) => getQuote(item.symbol))
    );

    let invested = 0;
    let currentValue = 0;

    holdings.forEach((item, index) => {
      invested += item.totalInvested;
      const price = quotes[index].c || 0;
      currentValue += price * item.quantity;
    });

    const pnl = currentValue - invested;
    const pnlPct = invested ? (pnl / invested) * 100 : 0;

    return res.json({ invested, currentValue, pnl, pnlPct });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getPortfolio, getAnalytics };
