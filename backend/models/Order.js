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
      enum: ["Pending", "Triggered", "Executed", "Cancelled", "Rejected"],
      default: "Pending"
    },
    executionPrice: { type: Number },
    executedQuantity: { type: Number, default: 0 },
    stopTriggeredAt: { type: Date },
    executedAt: { type: Date },
    cancelledAt: { type: Date },
    rejectionReason: { type: String },
    cancellationReason: { type: String },
    processingToken: { type: String },
    processingStartedAt: { type: Date },
    lastCheckedAt: { type: Date },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ userId: 1, symbol: 1, status: 1 });
orderSchema.index({ status: 1, symbol: 1, createdAt: 1 });
orderSchema.index({ processingToken: 1 });

module.exports = mongoose.model("Order", orderSchema);
