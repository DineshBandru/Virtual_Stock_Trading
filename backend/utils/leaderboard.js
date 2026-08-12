const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const { getQuote } = require("./market");
const { testingAccountFilter } = require("./testData");

const STARTING_BALANCE = 1000000;

const getQuotePrice = async (symbol) => {
  try {
    const quote = await getQuote(symbol);
    const price = Number(quote?.c);
    return Number.isFinite(price) && price > 0 ? price : null;
  } catch (err) {
    return null;
  }
};

const buildLeaderboard = async (currentUserId) => {
  const users = await User.find({ role: { $ne: "admin" }, ...testingAccountFilter }).select("name balance createdAt");
  const userIds = users.map((user) => user._id);
  const holdings = await Portfolio.find({ userId: { $in: userIds } }).lean();
  const tradeCounts = await Transaction.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: "$userId", tradeCount: { $sum: 1 } } }
  ]);

  const symbols = [...new Set(holdings.map((item) => item.symbol))];
  const quotes = await Promise.all(symbols.map((symbol) => getQuotePrice(symbol)));
  const priceMap = symbols.reduce((acc, symbol, index) => {
    acc[symbol] = quotes[index];
    return acc;
  }, {});
  const tradeCountMap = tradeCounts.reduce((acc, item) => {
    acc[item._id.toString()] = item.tradeCount;
    return acc;
  }, {});

  const userMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = {
      id: user._id.toString(),
      name: user.name,
      balance: user.balance,
      createdAt: user.createdAt,
      portfolioValue: Number(user.balance) || 0,
      tradeCount: tradeCountMap[user._id.toString()] || 0,
      valuationAvailable: true,
      unavailableSymbols: []
    };
    return acc;
  }, {});

  holdings.forEach((item) => {
    const record = userMap[item.userId.toString()];
    if (record) {
      const price = priceMap[item.symbol];
      if (Number.isFinite(price) && price > 0) {
        record.portfolioValue += price * (Number(item.quantity) || 0);
      } else {
        record.valuationAvailable = false;
        record.unavailableSymbols.push(item.symbol);
      }
    }
  });

  const rows = Object.values(userMap)
    .map((item) => {
      const profitLoss = item.portfolioValue - STARTING_BALANCE;
      const returnPct = STARTING_BALANCE > 0 ? (profitLoss / STARTING_BALANCE) * 100 : 0;
      return { ...item, profitLoss, returnPct };
    })
    .sort((a, b) => {
      if (b.portfolioValue !== a.portfolioValue) return b.portfolioValue - a.portfolioValue;
      if (b.tradeCount !== a.tradeCount) return b.tradeCount - a.tradeCount;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

  let previousValue = null;
  let previousRank = 0;
  const ranked = rows.map((item, index) => {
    const rank = previousValue === item.portfolioValue ? previousRank : index + 1;
    previousValue = item.portfolioValue;
    previousRank = rank;

    return {
      rank,
      name: item.name,
      portfolioValue: item.portfolioValue,
      profitLoss: item.profitLoss,
      returnPct: item.returnPct,
      tradeCount: item.tradeCount,
      valuationAvailable: item.valuationAvailable,
      unavailableSymbols: item.unavailableSymbols,
      isCurrentUser: currentUserId ? item.id === currentUserId : false
    };
  });

  return {
    rows: ranked,
    currentUser: ranked.find((item) => item.isCurrentUser) || null
  };
};

module.exports = { buildLeaderboard };
