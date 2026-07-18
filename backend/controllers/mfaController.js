const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User');

const enableMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const secret = speakeasy.generateSecret({ name: `VirtualStock (${user.email})` });
    // store secret temporarily until verified
    user.mfa = user.mfa || {};
    user.mfa.tempSecret = secret.base32;
    await user.save();
    const otpauth = secret.otpauth_url;
    const qr = await qrcode.toDataURL(otpauth);
    return res.json({ qr, otpauth });
  } catch (err) {
    return next(err);
  }
};

const verifyMfa = async (req, res, next) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    if (!user || !user.mfa || !user.mfa.tempSecret) return res.status(400).json({ message: 'MFA setup not initiated' });
    const verified = speakeasy.totp.verify({ secret: user.mfa.tempSecret, encoding: 'base32', token, window: 1 });
    if (!verified) return res.status(400).json({ message: 'Invalid token' });
    user.mfa.enabled = true;
    user.mfa.secret = user.mfa.tempSecret;
    delete user.mfa.tempSecret;
    await user.save();
    return res.json({ message: 'MFA enabled' });
  } catch (err) {
    return next(err);
  }
};

const disableMfa = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.mfa) return res.status(400).json({ message: 'MFA not enabled' });
    user.mfa.enabled = false;
    user.mfa.secret = undefined;
    await user.save();
    return res.json({ message: 'MFA disabled' });
  } catch (err) {
    return next(err);
  }
};

module.exports = { enableMfa, verifyMfa, disableMfa };
