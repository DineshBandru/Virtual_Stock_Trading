const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { getPositions } = require("../controllers/positionsController");

const router = express.Router();

router.get("/", requireAuth, getPositions);

module.exports = router;