const { finnhubRequest } = require("./finnhub");

const getQuote = async (symbol) => {
  const data = await finnhubRequest("/quote", { symbol });
  return data;
};

const getProfile = async (symbol) => {
  const data = await finnhubRequest("/stock/profile2", { symbol });
  return data;
};

const getHistory = async (symbol, resolution, from, to) => {
  const data = await finnhubRequest("/stock/candle", {
    symbol,
    resolution,
    from,
    to
  });
  return data;
};

module.exports = { getQuote, getProfile, getHistory };
