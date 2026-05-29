const Watchlist = require("../models/Watchlist");

const getWatchlist = async (req, res, next) => {
  try {
    const list = await Watchlist.findOne({ userId: req.user.id }).lean();
    return res.json(list || { symbols: [] });
  } catch (err) {
    return next(err);
  }
};

const addToWatchlist = async (req, res, next) => {
  try {
    const { symbol } = req.body;
    if (!symbol) {
      return res.status(400).json({ message: "Missing symbol" });
    }

    const list = await Watchlist.findOneAndUpdate(
      { userId: req.user.id },
      { $addToSet: { symbols: symbol.toUpperCase() } },
      { new: true, upsert: true }
    );

    return res.json(list);
  } catch (err) {
    return next(err);
  }
};

const removeFromWatchlist = async (req, res, next) => {
  try {
    const symbol = req.params.symbol;
    const list = await Watchlist.findOneAndUpdate(
      { userId: req.user.id },
      { $pull: { symbols: symbol.toUpperCase() } },
      { new: true }
    );
    return res.json(list || { symbols: [] });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
