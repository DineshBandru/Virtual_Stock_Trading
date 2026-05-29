const express = require("express");
const { buy, sell } = require("../controllers/tradeController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/buy", requireAuth, buy);
router.post("/sell", requireAuth, sell);

module.exports = router;
