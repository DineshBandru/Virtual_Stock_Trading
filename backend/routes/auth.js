const express = require("express");
const {
	register,
	login,
	logout,
	me,
	setTourSeen,
	refresh,
	logoutAll,
	forgotPassword,
	resetPassword,
	updateProfile,
	changePassword
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");
const { body } = require('express-validator');
const { runValidation } = require('../middleware/validate');
const { enableMfa, verifyMfa, disableMfa } = require('../controllers/mfaController');

const router = express.Router();

const preserveEmailAlias = {
	gmail_remove_dots: false,
	gmail_remove_subaddress: false,
	outlookdotcom_remove_subaddress: false,
	yahoo_remove_subaddress: false,
	icloud_remove_subaddress: false
};

router.post(
	"/register",
		[
		body('name').isLength({ min: 2 }).trim().escape(),
		body('email').isEmail().normalizeEmail(preserveEmailAlias),
		body('password').isStrongPassword({ minLength: 8 })
	],
	runValidation,
	register
);

router.post(
	"/login",
	[body('email').isEmail().normalizeEmail(preserveEmailAlias), body('password').isString().isLength({ min: 1 })],
	runValidation,
	login
);

router.post(
	"/forgot-password",
	[body('email').isEmail().normalizeEmail(preserveEmailAlias)],
	runValidation,
	forgotPassword
);

router.post(
	"/reset-password",
	[
		body('token').isString().isLength({ min: 32 }),
		body('password').isStrongPassword({ minLength: 8 })
	],
	runValidation,
	resetPassword
);

router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/logout-all', requireAuth, logoutAll);
router.patch(
	"/profile",
	requireAuth,
	[
		body('name').isLength({ min: 2 }).trim().escape(),
		body('email').isEmail().normalizeEmail(preserveEmailAlias),
		body('phone').optional({ checkFalsy: true }).isString().isLength({ min: 7, max: 20 }).trim(),
		body('tradingExperience').optional({ checkFalsy: true }).isIn(['beginner', 'intermediate', 'advanced', 'professional']),
		body('riskProfile').optional({ checkFalsy: true }).isIn(['conservative', 'moderate', 'aggressive']),
		body('tradingStyle').optional({ checkFalsy: true }).isIn(['intraday', 'swing', 'long_term', 'mixed']),
		body('notificationPreferences.orderUpdates').optional().isBoolean(),
		body('notificationPreferences.priceAlerts').optional().isBoolean(),
		body('notificationPreferences.portfolioDigest').optional().isBoolean(),
		body('notificationPreferences.productUpdates').optional().isBoolean()
	],
	runValidation,
	updateProfile
);
router.post(
	"/change-password",
	requireAuth,
	[
		body('currentPassword').isString().isLength({ min: 1 }),
		body('newPassword').isStrongPassword({ minLength: 8 }),
		body('confirmPassword').isString().isLength({ min: 1 })
	],
	runValidation,
	changePassword
);

// MFA endpoints
router.post('/mfa/setup', requireAuth, enableMfa);
router.post('/mfa/verify', requireAuth, [body('token').isString().notEmpty()], runValidation, verifyMfa);
router.post('/mfa/disable', requireAuth, disableMfa);

router.get("/me", requireAuth, me);
router.put("/tour", requireAuth, setTourSeen);

module.exports = router;
