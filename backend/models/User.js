const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    phone: { type: String, default: "" },
    tradingExperience: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "professional", ""],
      default: ""
    },
    riskProfile: {
      type: String,
      enum: ["conservative", "moderate", "aggressive", ""],
      default: ""
    },
    tradingStyle: {
      type: String,
      enum: ["intraday", "swing", "long_term", "mixed", ""],
      default: ""
    },
    notificationPreferences: {
      orderUpdates: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      portfolioDigest: { type: Boolean, default: false },
      productUpdates: { type: Boolean, default: false }
    },
    balance: { type: Number, default: 1000000 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    hasSeenTour: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    passwordResetTokenHash: { type: String, index: true },
    passwordResetExpires: { type: Date },
    passwordResetUsedAt: { type: Date },
    mfa: {
      enabled: { type: Boolean, default: false },
      secret: { type: String },
      tempSecret: { type: String }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
