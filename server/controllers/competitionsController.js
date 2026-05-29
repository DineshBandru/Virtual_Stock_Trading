const Competition = require("../models/Competition");

const getCompetitions = async (req, res, next) => {
  try {
    const competitions = await Competition.find().sort({ startDate: 1 });
    return res.json(competitions);
  } catch (err) {
    return next(err);
  }
};

const joinCompetition = async (req, res, next) => {
  try {
    const competition = await Competition.findById(req.params.id);
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
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
    const competition = await Competition.findById(req.params.id).populate(
      "participants.userId",
      "name"
    );
    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    const ranked = competition.participants
      .map((item) => ({
        name: item.userId.name,
        balance: item.balance
      }))
      .sort((a, b) => b.balance - a.balance)
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return res.json(ranked);
  } catch (err) {
    return next(err);
  }
};

module.exports = { getCompetitions, joinCompetition, getCompetitionLeaderboard };
