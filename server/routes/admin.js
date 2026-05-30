const express = require("express");
const {
  getUsers,
  getTransactions,
  createCompetition,
  getStats
} = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { body } = require('express-validator');
const { runValidation } = require('../middleware/validate');

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/transactions", requireAuth, requireAdmin, getTransactions);
router.post(
  "/competitions",
  requireAuth,
  requireAdmin,
  [
    body('name').isString().trim().notEmpty().escape(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('startingBalance').isNumeric()
  ],
  runValidation,
  createCompetition
);
router.get("/stats", requireAuth, requireAdmin, getStats);

module.exports = router;
