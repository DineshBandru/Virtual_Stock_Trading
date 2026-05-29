const express = require("express");
const { getTransactions, exportCsv } = require("../controllers/transactionsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getTransactions);
router.get("/export", requireAuth, exportCsv);

module.exports = router;
