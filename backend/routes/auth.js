const express = require("express");
const { register, login, logout, me, setTourSeen, refresh, logoutAll } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { body } = require('express-validator');
const { runValidation } = require('../middleware/validate');
const { enableMfa, verifyMfa, disableMfa } = require('../controllers/mfaController');

const router = express.Router();

router.post(
	"/register",
	[
		body('name').isLength({ min: 2 }).trim().escape(),
		body('email').isEmail().normalizeEmail(),
		body('password').isStrongPassword({ minLength: 8 })
	],
	runValidation,
	register
);

router.post(
	"/login",
	[body('email').isEmail().normalizeEmail(), body('password').isString().isLength({ min: 1 })],
	runValidation,
	login
);

router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/logout-all', requireAuth, logoutAll);

// MFA endpoints
router.post('/mfa/setup', requireAuth, enableMfa);
router.post('/mfa/verify', requireAuth, [body('token').isString().notEmpty()], runValidation, verifyMfa);
router.post('/mfa/disable', requireAuth, disableMfa);

router.get("/me", requireAuth, me);
router.put("/tour", requireAuth, setTourSeen);

module.exports = router;
