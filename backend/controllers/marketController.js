const { getMarketDiscovery } = require("../services/marketDiscoveryService");

const getDiscovery = async (req, res, next) => {
  try {
    const payload = await getMarketDiscovery({
      type: String(req.query.type || "gainers").toLowerCase(),
      limit: req.query.limit
    });
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getDiscovery
};
