const { buildLeaderboard } = require("../utils/leaderboard");

const getLeaderboard = async (req, res, next) => {
  try {
    const payload = await buildLeaderboard();
    return res.json(payload);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getLeaderboard };
