const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar: { type: String, default: "" },
    balance: { type: Number, default: 1000000 },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    hasSeenTour: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    mfa: {
      enabled: { type: Boolean, default: false },
      secret: { type: String },
      tempSecret: { type: String }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
