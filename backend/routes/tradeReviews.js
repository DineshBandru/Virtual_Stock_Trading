const express = require("express");
const { getTradeReview, upsertTradeReview } = require("../controllers/tradeReviewsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/:episodeId", requireAuth, getTradeReview);
router.put("/:episodeId", requireAuth, upsertTradeReview);

module.exports = router;
