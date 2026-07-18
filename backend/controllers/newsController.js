const { finnhubRequest } = require("../utils/finnhub");

const getNews = async (req, res, next) => {
  try {
    const data = await finnhubRequest("/news", { category: "general" });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

const getCompanyNews = async (req, res, next) => {
  try {
    const symbol = req.params.symbol;
    const now = new Date();
    const to = now.toISOString().slice(0, 10);
    const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const from = fromDate.toISOString().slice(0, 10);
    const data = await finnhubRequest("/company-news", {
      symbol,
      from,
      to
    });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getNews, getCompanyNews };
