const express = require("express");
const {
  getWatchlist,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  setActiveWatchlist,
  addToWatchlist,
  removeFromWatchlist
} = require("../controllers/watchlistController");
const { requireAuth } = require("../middleware/auth");
const { body, param } = require('express-validator');
const { runValidation } = require('../middleware/validate');

const router = express.Router();

router.get("/", requireAuth, getWatchlist);
router.post("/lists", requireAuth, createWatchlist);
router.patch("/lists/:listId", requireAuth, renameWatchlist);
router.delete("/lists/:listId", requireAuth, deleteWatchlist);
router.patch("/active/:listId", requireAuth, setActiveWatchlist);
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
