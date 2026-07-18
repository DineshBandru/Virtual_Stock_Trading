const { getMarketDepth } = require("../services/marketDepthService");

const getMarketDepthBySymbol = async (req, res, next) => {
  try {
    const depth = await getMarketDepth(req.params.symbol);
    return res.json(depth);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getMarketDepthBySymbol };