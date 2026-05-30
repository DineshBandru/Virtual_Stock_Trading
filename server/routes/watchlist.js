const express = require("express");
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
} = require("../controllers/watchlistController");
const { requireAuth } = require("../middleware/auth");
const { body, param } = require('express-validator');
const { runValidation } = require('../middleware/validate');

const router = express.Router();

router.get("/", requireAuth, getWatchlist);
router.post(
  "/add",
  requireAuth,
  [body('symbol').isString().trim().notEmpty().escape()],
  runValidation,
  addToWatchlist
);
router.delete(
  "/remove/:symbol",
  requireAuth,
  [param('symbol').isString().trim().notEmpty().escape()],
  runValidation,
  removeFromWatchlist
);

module.exports = router;
