const express = require("express");
const { buy, sell } = require("../controllers/tradeController");
const { requireAuth } = require("../middleware/auth");
const { body } = require('express-validator');
const { runValidation } = require('../middleware/validate');

const router = express.Router();

router.post(
	"/buy",
	requireAuth,
	[body('symbol').isString().trim().notEmpty(), body('quantity').isInt({ gt: 0 })],
	runValidation,
	buy
);

router.post(
	"/sell",
	requireAuth,
	[body('symbol').isString().trim().notEmpty(), body('quantity').isInt({ gt: 0 })],
	runValidation,
	sell
);

module.exports = router;
