const mongoose = require("mongoose");

const tradeReviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tradeEpisodeId: { type: String, required: true, trim: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    entryReason: { type: String, default: "", maxlength: 1500 },
    exitReason: { type: String, default: "", maxlength: 1500 },
    lesson: { type: String, default: "", maxlength: 1500 },
    improvement: { type: String, default: "", maxlength: 1500 }
  },
  { timestamps: true }
);

tradeReviewSchema.index({ userId: 1, tradeEpisodeId: 1 }, { unique: true });

module.exports = mongoose.model("TradeReview", tradeReviewSchema);
