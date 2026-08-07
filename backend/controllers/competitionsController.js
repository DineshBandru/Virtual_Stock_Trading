const Competition = require("../models/Competition");
const mongoose = require("mongoose");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getCompetitions = async (req, res, next) => {
  try {
    const competitions = await Competition.find({ archived: { $ne: true } })
      .sort({ startDate: 1 })
      .lean();
    const userId = req.user?.id;

    return res.json(
      competitions.map((competition) => {
        const participant = competition.participants.find(
          (item) => item.userId.toString() === userId
        );

        return {
          _id: competition._id,
          name: competition.name,
          description: competition.description,
          startDate: competition.startDate,
          endDate: competition.endDate,
          startingBalance: competition.startingBalance,
          status: competition.status,
          participantCount: competition.participants.length,
          isJoined: Boolean(participant),
          participantBalance: participant?.balance ?? null
        };
      })
    );
  } catch (err) {
    return next(err);
  }
};

const joinCompetition = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid competition id" });
    }
    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }
    if (competition.archived) {
      return res.status(400).json({ message: "Competition is archived" });
    }
    if (competition.status === "completed" || competition.status === "ended") {
      return res.status(400).json({ message: "Competition has ended" });
    }
    const exists = competition.participants.find(
      (item) => item.userId.toString() === req.user.id
    );
    if (exists) {
      return res.status(409).json({ message: "Already joined" });
    }
    competition.participants.push({
      userId: req.user.id,
      balance: competition.startingBalance
    });
    await competition.save();
    return res.json(competition);
  } catch (err) {
    return next(err);
  }
};

const getCompetitionLeaderboard = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ message: "Invalid competition id" });
    }
    const competition = await Competition.findById(req.params.id).populate(
      "participants.userId",
      "name"
    );
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const rows = competition.participants
      .map((item) => ({
        name: item.userId?.name || "Trader",
        balance: item.balance,
        isCurrentUser: item.userId?._id?.toString() === req.user?.id
      }))
      .sort((a, b) => b.balance - a.balance);
    let previousBalance = null;
    let previousRank = 0;
    const ranked = rows.map((item, index) => {
      const rank = previousBalance === item.balance ? previousRank : index + 1;
      previousBalance = item.balance;
      previousRank = rank;
      return { ...item, rank };
    });

    return res.json({
      competition: {
        _id: competition._id,
        name: competition.name,
        status: competition.status,
        startDate: competition.startDate,
        endDate: competition.endDate
      },
      rows: ranked,
      currentUser: ranked.find((item) => item.isCurrentUser) || null
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getCompetitions, joinCompetition, getCompetitionLeaderboard };
