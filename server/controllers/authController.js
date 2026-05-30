const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const User = require("../models/User");
const RefreshToken = require('../models/RefreshToken');

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

const setTokensCookies = (res, accessToken, refreshRawToken) => {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('token', accessToken, { httpOnly: true, sameSite: 'lax', secure, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshRawToken, { httpOnly: true, sameSite: 'lax', secure, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

const clearAuthCookies = (res) => {
  res.clearCookie('token');
  res.clearCookie('refreshToken');
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

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
      avatar: user.avatar,
      hasSeenTour: user.hasSeenTour
    });
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
    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      balance: user.balance,
      avatar: user.avatar,
      hasSeenTour: user.hasSeenTour
    });
  } catch (err) {
    return next(err);
  }
};

const logout = async (req, res) => {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (token) {
      await RefreshToken.findOneAndUpdate({ token }, { revoked: true, revokedAt: new Date() });
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
    // token reuse detection: if doc revoked -> possible reuse
    if (!doc) {
      // can't find token — potential theft or reuse; attempt best-effort mitigation
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
    return res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
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
    const user = await User.findById(req.user.id).select("-password");
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

module.exports = { register, login, logout, me, setTourSeen, refresh, logoutAll };
