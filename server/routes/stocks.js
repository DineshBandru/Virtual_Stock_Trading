const express = require("express");
const {
  searchStocks,
  getStock,
  getHistoryByPeriod,
  getTrending
} = require("../controllers/stocksController");

const router = express.Router();

router.get("/search", searchStocks);
router.get("/trending", getTrending);
router.get("/:symbol/history", getHistoryByPeriod);
router.get("/:symbol", getStock);

module.exports = router;
