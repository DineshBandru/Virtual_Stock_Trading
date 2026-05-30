const express = require("express");
const { register, login, logout, me, setTourSeen } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.put("/tour", requireAuth, setTourSeen);

module.exports = router;
