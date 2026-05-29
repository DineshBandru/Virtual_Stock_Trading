const express = require("express");
const {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist
} = require("../controllers/watchlistController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getWatchlist);
router.post("/add", requireAuth, addToWatchlist);
router.delete("/remove/:symbol", requireAuth, removeFromWatchlist);

module.exports = router;
