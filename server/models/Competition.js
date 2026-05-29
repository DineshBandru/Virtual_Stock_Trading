const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    balance: { type: Number, required: true }
  },
  { _id: false }
);

const competitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    startingBalance: { type: Number, required: true },
    participants: { type: [participantSchema], default: [] },
    status: { type: String, enum: ["upcoming", "active", "ended"], default: "upcoming" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Competition", competitionSchema);
