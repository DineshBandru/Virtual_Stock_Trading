const express = require("express");
const {
  getUsers,
  getTransactions,
  createCompetition,
  getStats
} = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/transactions", requireAuth, requireAdmin, getTransactions);
router.post("/competitions", requireAuth, requireAdmin, createCompetition);
router.get("/stats", requireAuth, requireAdmin, getStats);

module.exports = router;
