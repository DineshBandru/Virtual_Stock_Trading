const Transaction = require("../models/Transaction");
const TradeReview = require("../models/TradeReview");
const { reconstructClosedTrades } = require("../services/performanceAnalyticsService");

const TEXT_LIMIT = 1500;

const cleanText = (value) =>
  String(value || "")
    .replace(/\0/g, "")
    .slice(0, TEXT_LIMIT);

const findClosedTradeForUser = async (userId, episodeId) => {
  const transactions = await Transaction.find({ userId }).sort({ timestamp: 1, _id: 1 }).lean();
  return reconstructClosedTrades(transactions, userId).find((trade) => trade.episodeId === episodeId) || null;
};

const getTradeReview = async (req, res, next) => {
  try {
    const trade = await findClosedTradeForUser(req.user.id, req.params.episodeId);
    if (!trade) {
      return res.status(404).json({ message: "Closed trade episode not found" });
    }

    const review = await TradeReview.findOne({
      userId: req.user.id,
      tradeEpisodeId: trade.episodeId
    }).lean();

    return res.json({ trade, review });
  } catch (err) {
    return next(err);
  }
};

const upsertTradeReview = async (req, res, next) => {
  try {
    const trade = await findClosedTradeForUser(req.user.id, req.params.episodeId);
    if (!trade) {
      return res.status(404).json({ message: "Closed trade episode not found" });
    }

    const payload = {
      userId: req.user.id,
      tradeEpisodeId: trade.episodeId,
      symbol: trade.symbol,
      entryReason: cleanText(req.body.entryReason),
      exitReason: cleanText(req.body.exitReason),
      lesson: cleanText(req.body.lesson),
      improvement: cleanText(req.body.improvement)
    };

    const review = await TradeReview.findOneAndUpdate(
      { userId: req.user.id, tradeEpisodeId: trade.episodeId },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ trade, review });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getTradeReview,
  upsertTradeReview
};
