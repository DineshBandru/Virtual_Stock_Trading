const Transaction = require("../models/Transaction");
const TradeReview = require("../models/TradeReview");
const { buildPerformanceAnalytics, reconstructClosedTrades } = require("../services/performanceAnalyticsService");

const getUserTransactions = (userId) =>
  Transaction.find({ userId }).sort({ timestamp: 1, _id: 1 }).lean();

const getPerformanceAnalytics = async (req, res, next) => {
  try {
    const [transactions, reviews] = await Promise.all([
      getUserTransactions(req.user.id),
      TradeReview.find({ userId: req.user.id }).select("tradeEpisodeId").lean()
    ]);
    const reviewedEpisodeIds = reviews.map((review) => review.tradeEpisodeId);
    return res.json(buildPerformanceAnalytics(transactions, req.user.id, reviewedEpisodeIds));
  } catch (err) {
    return next(err);
  }
};

const getClosedTrades = async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const transactions = await getUserTransactions(req.user.id);
    const trades = reconstructClosedTrades(transactions, req.user.id)
      .sort((left, right) => new Date(right.closedAt) - new Date(left.closedAt))
      .slice(0, limit);
    return res.json({ count: trades.length, result: trades });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getClosedTrades,
  getPerformanceAnalytics
};
