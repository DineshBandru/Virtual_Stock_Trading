const express = require("express");
const { getAlerts, createAlert, deleteAlert } = require("../controllers/alertsController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, getAlerts);
router.post("/", requireAuth, createAlert);
router.delete("/:id", requireAuth, deleteAlert);

module.exports = router;
