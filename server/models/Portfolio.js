const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true },
    companyName: { type: String, required: true },
    quantity: { type: Number, required: true },
    avgBuyPrice: { type: Number, required: true },
    totalInvested: { type: Number, required: true }
  },
  { timestamps: true }
);

portfolioSchema.index({ userId: 1, symbol: 1 }, { unique: true });

module.exports = mongoose.model("Portfolio", portfolioSchema);
