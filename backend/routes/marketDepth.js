const express = require("express");
const { param } = require("express-validator");
const { runValidation } = require("../middleware/validate");
const { getMarketDepthBySymbol } = require("../controllers/marketDepthController");

const router = express.Router();

router.get(
  "/:symbol",
  [param("symbol").isString().trim().notEmpty()],
  runValidation,
  getMarketDepthBySymbol
);

module.exports = router;