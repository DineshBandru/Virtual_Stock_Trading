const mongoose = require("mongoose");

const watchlistEntrySchema = new mongoose.Schema(
  {
    symbol: { type: String, required: true, uppercase: true, trim: true },
    companyName: { type: String, default: "" }
  },
  { timestamps: true }
);

const watchlistListSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false },
    items: { type: [watchlistEntrySchema], default: [] },
    symbols: { type: [String], default: [] }
  },
  { timestamps: true }
);

const watchlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    activeListId: { type: mongoose.Schema.Types.ObjectId },
    symbols: { type: [String], default: [] },
    lists: { type: [watchlistListSchema], default: [] }
  },
  { timestamps: true }
);

watchlistSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("Watchlist", watchlistSchema);