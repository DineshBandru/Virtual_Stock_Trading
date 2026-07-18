const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    symbol: { type: String, required: true },
    companyName: { type: String, required: true },
    side: { type: String, enum: ["BUY", "SELL"], required: true },
    quantity: { type: Number, required: true },
    orderType: {
      type: String,
      enum: ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LIMIT"],
      required: true
    },
    triggerPrice: { type: Number },
    limitPrice: { type: Number },
    status: {
      type: String,
      enum: ["Pending", "Executed", "Cancelled", "Rejected"],
      default: "Pending"
    },
    executionPrice: { type: Number },
    stopTriggeredAt: { type: Date },
    executedAt: { type: Date },
    rejectionReason: { type: String }
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, symbol: 1, status: 1 });

module.exports = mongoose.model("Order", orderSchema);