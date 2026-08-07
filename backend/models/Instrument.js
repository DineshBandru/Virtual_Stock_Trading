const mongoose = require("mongoose");

const instrumentSchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true },
    tradingSymbol: { type: String, required: true, uppercase: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    exchange: { type: String, required: true, uppercase: true, trim: true, default: "NSE" },
    series: { type: String, required: true, uppercase: true, trim: true },
    isin: { type: String, trim: true },
    instrumentType: { type: String, required: true, uppercase: true, trim: true, default: "EQUITY" },
    active: { type: Boolean, default: true },
    searchText: { type: String, required: true, lowercase: true, trim: true },
    lastSyncedAt: { type: Date, required: true }
  },
  { timestamps: true }
);

instrumentSchema.index({ exchange: 1, tradingSymbol: 1 }, { unique: true });
instrumentSchema.index({ symbol: 1 });
instrumentSchema.index({ tradingSymbol: 1, active: 1 });
instrumentSchema.index({ companyName: 1, active: 1 });
instrumentSchema.index({ searchText: 1, active: 1 });
instrumentSchema.index({ active: 1, exchange: 1, instrumentType: 1, series: 1 });

module.exports = mongoose.model("Instrument", instrumentSchema);
