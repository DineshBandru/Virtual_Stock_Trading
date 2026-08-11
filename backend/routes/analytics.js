const express = require("express");
const { getClosedTrades, getPerformanceAnalytics } = require("../controllers/analyticsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/performance", requireAuth, getPerformanceAnalytics);
router.get("/closed-trades", requireAuth, getClosedTrades);

module.exports = router;
