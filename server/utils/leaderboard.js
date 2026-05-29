const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const { getQuote } = require("./market");

const buildLeaderboard = async () => {
  const users = await User.find().select("name balance createdAt");
  const holdings = await Portfolio.find().lean();

  const symbols = [...new Set(holdings.map((item) => item.symbol))];
  const quotes = await Promise.all(symbols.map((symbol) => getQuote(symbol)));
  const priceMap = symbols.reduce((acc, symbol, index) => {
    acc[symbol] = quotes[index].c || 0;
    return acc;
  }, {});

  const userMap = users.reduce((acc, user) => {
    acc[user._id.toString()] = {
      id: user._id,
      name: user.name,
      balance: user.balance,
      createdAt: user.createdAt,
      value: user.balance
    };
    return acc;
  }, {});

  holdings.forEach((item) => {
    const record = userMap[item.userId.toString()];
    if (record) {
      record.value += (priceMap[item.symbol] || 0) * item.quantity;
    }
  });

  return Object.values(userMap)
    .map((item) => {
      const base = 1000000;
      const returnPct = ((item.value - base) / base) * 100;
      return { ...item, returnPct };
    })
    .sort((a, b) => b.value - a.value)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      portfolioValue: item.value,
      returnPct: item.returnPct
    }));
};

module.exports = { buildLeaderboard };
