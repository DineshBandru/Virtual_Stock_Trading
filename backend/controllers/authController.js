const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require("../models/User");
const RefreshToken = require('../models/RefreshToken');
const { getCookieOptions } = require("../config/env");
const { getEmailProviderName, sendPasswordResetEmail } = require("../services/emailService");

const createAccessToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion || 0 }, process.env.JWT_SECRET, {
    expiresIn: '15m'
  });

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createRefreshTokenDoc = async (userId, ip) => {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const doc = await RefreshToken.create({ userId, tokenHash, expires });
  // return raw token and doc
  return { rawToken: token, doc };
};

const createPasswordResetToken = () => crypto.randomBytes(32).toString('hex');

const getClientResetBaseUrl = () => {
  const origins = (process.env.CLIENT_URL || 'http://localhost:3010')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins[0] || 'http://localhost:3010';
};

const buildPasswordResetUrl = (resetToken) => {
  const url = new URL("/reset-password", getClientResetBaseUrl());
  url.searchParams.set("token", resetToken);
  return url.toString();
};

const setTokensCookies = (res, accessToken, refreshRawToken) => {
  res.cookie('token', accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie('refreshToken', refreshRawToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
};

const USER_SAFE_FIELDS = "name email role balance avatar phone tradingExperience riskProfile tradingStyle notificationPreferences hasSeenTour createdAt updatedAt";

const toUserPayload = (user) => ({
  id: user._id,
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  balance: user.balance,
  avatar: user.avatar,
  phone: user.phone || "",
  tradingExperience: user.tradingExperience || "",
  riskProfile: user.riskProfile || "",
  tradingStyle: user.tradingStyle || "",
  notificationPreferences: {
    orderUpdates: user.notificationPreferences?.orderUpdates ?? true,
    priceAlerts: user.notificationPreferences?.priceAlerts ?? true,
    portfolioDigest: user.notificationPreferences?.portfolioDigest ?? false,
    productUpdates: user.notificationPreferences?.productUpdates ?? false
  },
  hasSeenTour: user.hasSeenTour,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const clearAuthCookies = (res) => {
  const { maxAge, ...options } = getCookieOptions(0);
  res.clearCookie('token', options);
  res.clearCookie('refreshToken', options);
};

const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const accessToken = createAccessToken(user);
    const { rawToken, doc } = await createRefreshTokenDoc(user._id, req.ip);
    setTokensCookies(res, accessToken, rawToken);

    return res.status(201).json(toUserPayload(user));
  } catch (err) {
    return next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    // account lockout check
    if (user && user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ message: 'Account locked. Try later or reset password.' });
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      // increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock 15 minutes
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // reset failed attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }
    // MFA check for admin
    if (user.role === 'admin' && user.mfa && user.mfa.enabled) {
      const totp = req.body.totp;
      if (!totp) {
        return res.status(202).json({ message: 'MFA required' });
      }
      const verified = speakeasy.totp.verify({ secret: user.mfa.secret, encoding: 'base32', token: totp, window: 1 });
      if (!verified) {
        return res.status(401).json({ message: 'Invalid MFA code' });
      }
    }
    const accessToken = createAccessToken(user);
    const { rawToken, doc } = await createRefreshTokenDoc(user._id, req.ip);
    setTokensCookies(res, accessToken, rawToken);
    return res.json(toUserPayload(user));
  } catch (err) {
    return next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const genericMessage = 'If an account exists for that email, a password reset link has been sent.';

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const resetToken = createPasswordResetToken();
    user.passwordResetTokenHash = hashToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    user.passwordResetUsedAt = undefined;
    await user.save();

    const resetLink = buildPasswordResetUrl(resetToken);
    const includeDevelopmentResetLink = process.env.NODE_ENV !== 'production';

    try {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink
      });
    } catch (emailError) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpires = undefined;
      user.passwordResetUsedAt = undefined;
      await user.save();
      console.error("Password reset email delivery failed", {
        provider: getEmailProviderName(),
        status: emailError.status || null,
        message: emailError.message
      });
      return res.json({ message: genericMessage });
    }

    return res.json({
      message: genericMessage,
      ...(includeDevelopmentResetLink ? { resetLink, resetToken } : {})
    });
  } catch (err) {
    return next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
      passwordResetUsedAt: { $exists: false }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired password reset token' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetUsedAt = new Date();
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpires = undefined;
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await RefreshToken.updateMany(
      { userId: user._id, revoked: false },
      { revoked: true, revokedAt: new Date() }
    );

    return res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (token) {
      await RefreshToken.findOneAndUpdate({ tokenHash: hashToken(token) }, { revoked: true, revokedAt: new Date() });
    }
    clearAuthCookies(res);
    return res.json({ message: "Logged out" });
  } catch (err) {
    return res.status(500).json({ message: 'Logout failed' });
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });
    const tokenHash = hashToken(token);
    const doc = await RefreshToken.findOne({ tokenHash });
    if (!doc) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    if (doc.revoked || doc.expires < new Date()) {
      // revoke all sessions for user as precaution
      await RefreshToken.updateMany({ userId: doc.userId, revoked: false }, { revoked: true, revokedAt: new Date() });
      await User.findByIdAndUpdate(doc.userId, { $inc: { tokenVersion: 1 } });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const user = await User.findById(doc.userId);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    // rotate: create new refresh token and revoke old
    const { rawToken: newRaw, doc: newDoc } = await createRefreshTokenDoc(user._id, req.ip);
    doc.revoked = true;
    doc.revokedAt = new Date();
    doc.replacedByTokenHash = newDoc.tokenHash;
    await doc.save();

    const accessToken = createAccessToken(user);
    setTokensCookies(res, accessToken, newRaw);
    return res.json(toUserPayload(user));
  } catch (err) {
    return next(err);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    // requireAuth ensures req.user
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    // increment tokenVersion to invalidate existing access tokens
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    // revoke all refresh tokens
    await RefreshToken.updateMany({ userId: user._id, revoked: false }, { revoked: true, revokedAt: new Date() });
    clearAuthCookies(res);
    return res.json({ message: 'Logged out from all devices' });
  } catch (err) {
    return next(err);
  }
};

const me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(USER_SAFE_FIELDS);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    return next(err);
  }
};

const setTourSeen = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { hasSeenTour: true },
      { new: true, select: "-password" }
    );
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json(user);
  } catch (err) {
    return next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, "balance")) {
      return res.status(403).json({ message: "Virtual balance can only be changed by an admin" });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const phone = String(req.body.phone || "").trim();
    const tradingExperience = String(req.body.tradingExperience || "").trim();
    const riskProfile = String(req.body.riskProfile || "").trim();
    const tradingStyle = String(req.body.tradingStyle || "").trim();
    const notificationPreferences = req.body.notificationPreferences || {};

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (phone && !/^[0-9+\-\s()]{7,20}$/.test(phone)) {
      return res.status(400).json({ message: "Enter a valid phone number" });
    }

    const allowedExperience = ["", "beginner", "intermediate", "advanced", "professional"];
    const allowedRisk = ["", "conservative", "moderate", "aggressive"];
    const allowedStyle = ["", "intraday", "swing", "long_term", "mixed"];
    if (!allowedExperience.includes(tradingExperience)) {
      return res.status(400).json({ message: "Unsupported trading experience" });
    }
    if (!allowedRisk.includes(riskProfile)) {
      return res.status(400).json({ message: "Unsupported risk profile" });
    }
    if (!allowedStyle.includes(tradingStyle)) {
      return res.status(400).json({ message: "Unsupported trading style" });
    }

    const existing = await User.findOne({ email, _id: { $ne: req.user.id } }).select("_id");
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        name,
        email,
        phone,
        tradingExperience,
        riskProfile,
        tradingStyle,
        notificationPreferences: {
          orderUpdates: Boolean(notificationPreferences.orderUpdates),
          priceAlerts: Boolean(notificationPreferences.priceAlerts),
          portfolioDigest: Boolean(notificationPreferences.portfolioDigest),
          productUpdates: Boolean(notificationPreferences.productUpdates)
        }
      },
      {
        new: true,
        select: USER_SAFE_FIELDS
      }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(toUserPayload(user));
  } catch (err) {
    return next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "New password confirmation does not match" });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ message: "New password must be different from current password" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    await RefreshToken.updateMany(
      { userId: user._id, revoked: false },
      { revoked: true, revokedAt: new Date() }
    );

    clearAuthCookies(res);
    return res.json({ message: "Password changed successfully. Please sign in again." });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
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
};
