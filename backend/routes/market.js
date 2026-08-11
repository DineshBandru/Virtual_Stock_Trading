const express = require("express");
const { getDiscovery } = require("../controllers/marketController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/discovery", requireAuth, getDiscovery);

module.exports = router;
