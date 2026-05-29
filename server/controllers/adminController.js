const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Competition = require("../models/Competition");

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("name email role balance createdAt");
    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const items = await Transaction.find()
      .sort({ timestamp: -1 })
      .limit(500)
      .lean();
    return res.json(items);
  } catch (err) {
    return next(err);
  }
};

const createCompetition = async (req, res, next) => {
  try {
    const { name, startDate, endDate, startingBalance } = req.body;
    if (!name || !startDate || !endDate || !startingBalance) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const competition = await Competition.create({
      name,
      startDate,
      endDate,
      startingBalance,
      status: "upcoming"
    });
    return res.status(201).json(competition);
  } catch (err) {
    return next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [users, transactions] = await Promise.all([
      User.countDocuments(),
      Transaction.countDocuments()
    ]);
    const totalBalanceAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$balance" } } }
    ]);
    const totalBalance = totalBalanceAgg[0] ? totalBalanceAgg[0].total : 0;

    return res.json({
      totalUsers: users,
      totalTransactions: transactions,
      totalVirtualMoney: totalBalance
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getUsers, getTransactions, createCompetition, getStats };
