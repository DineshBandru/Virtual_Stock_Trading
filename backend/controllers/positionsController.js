const { buildPositions } = require("../services/positionsService");

const getPositions = async (req, res, next) => {
  try {
    const payload = await buildPositions(req.user.id);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
};

module.exports = { getPositions };