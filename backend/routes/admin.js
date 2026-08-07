const express = require("express");
const {
  getUsers,
  getTransactions,
  getOrders,
  createCompetition,
  getCompetitions,
  archiveCompetition,
  getStats,
  syncInstruments
} = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { body } = require('express-validator');
const { runValidation } = require('../middleware/validate');

const router = express.Router();

router.get("/users", requireAuth, requireAdmin, getUsers);
router.get("/transactions", requireAuth, requireAdmin, getTransactions);
router.get("/orders", requireAuth, requireAdmin, getOrders);
router.get("/competitions", requireAuth, requireAdmin, getCompetitions);
router.post(
  "/competitions",
  requireAuth,
  requireAdmin,
  [
    body('name').isString().trim().notEmpty().escape(),
    body('description').optional().isString().trim().escape(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
    body('startingBalance').isFloat({ gt: 0 }),
    body('status').optional().isIn(['upcoming', 'active', 'completed', 'ended'])
  ],
  runValidation,
  createCompetition
);
router.patch("/competitions/:id/archive", requireAuth, requireAdmin, archiveCompetition);
router.get("/stats", requireAuth, requireAdmin, getStats);
router.post("/instruments/sync", requireAuth, requireAdmin, syncInstruments);

module.exports = router;
