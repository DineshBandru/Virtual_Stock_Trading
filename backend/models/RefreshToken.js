const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expires: { type: Date, required: true, index: true },
    createdAt: { type: Date, default: Date.now },
    replacedByTokenHash: { type: String },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date }
  },
  { timestamps: true }
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
