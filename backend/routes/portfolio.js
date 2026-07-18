const express = require("express");
const { getPortfolio, getAnalytics } = require("../controllers/portfolioController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getPortfolio);
router.get("/analytics", requireAuth, getAnalytics);

module.exports = router;
