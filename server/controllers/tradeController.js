const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const { getQuote, getProfile } = require("../utils/market");

const buy = async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const [quote, profile, user] = await Promise.all([
      getQuote(symbol),
      getProfile(symbol),
      User.findById(req.user.id)
    ]);

    const price = quote.c;
    if (!price) {
      return res.status(400).json({ message: "Price unavailable" });
    }

    const totalCost = price * quantity;
    if (user.balance < totalCost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const companyName = profile.name || symbol;

    let holding = await Portfolio.findOne({ userId: user._id, symbol });
    if (!holding) {
      holding = await Portfolio.create({
        userId: user._id,
        symbol,
        companyName,
        quantity,
        avgBuyPrice: price,
        totalInvested: totalCost
      });
    } else {
      const newQty = holding.quantity + quantity;
      const newTotal = holding.totalInvested + totalCost;
      holding.quantity = newQty;
      holding.totalInvested = newTotal;
      holding.avgBuyPrice = newTotal / newQty;
      holding.companyName = companyName;
      await holding.save();
    }

    user.balance -= totalCost;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: "BUY",
      symbol,
      companyName,
      quantity,
      price,
      total: totalCost
    });

    return res.json({ balance: user.balance, holding });
  } catch (err) {
    return next(err);
  }
};

const sell = async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const [quote, profile, user, holding] = await Promise.all([
      getQuote(symbol),
      getProfile(symbol),
      User.findById(req.user.id),
      Portfolio.findOne({ userId: req.user.id, symbol })
    ]);

    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ message: "Not enough shares" });
    }

    const price = quote.c;
    if (!price) {
      return res.status(400).json({ message: "Price unavailable" });
    }

    const totalReturn = price * quantity;
    const investedReduction = holding.avgBuyPrice * quantity;

    holding.quantity -= quantity;
    holding.totalInvested = Math.max(0, holding.totalInvested - investedReduction);
    if (holding.quantity === 0) {
      await holding.deleteOne();
    } else {
      await holding.save();
    }

    user.balance += totalReturn;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: "SELL",
      symbol,
      companyName: profile.name || symbol,
      quantity,
      price,
      total: totalReturn
    });

    return res.json({ balance: user.balance });
  } catch (err) {
    return next(err);
  }
};

module.exports = { buy, sell };
