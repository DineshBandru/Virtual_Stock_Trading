const express = require("express");
const {
  getCompetitions,
  joinCompetition,
  getCompetitionLeaderboard
} = require("../controllers/competitionsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", getCompetitions);
router.post("/join/:id", requireAuth, joinCompetition);
router.get("/:id/leaderboard", getCompetitionLeaderboard);

module.exports = router;
