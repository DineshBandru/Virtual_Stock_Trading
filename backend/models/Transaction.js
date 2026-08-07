const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    type: { type: String, enum: ["BUY", "SELL"], required: true },
    symbol: { type: String, required: true },
    companyName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    realizedPnL: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

transactionSchema.index(
  { orderId: 1 },
  { unique: true, partialFilterExpression: { orderId: { $exists: true } } }
);
transactionSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model("Transaction", transactionSchema);
