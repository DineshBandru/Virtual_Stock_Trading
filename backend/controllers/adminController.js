const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Competition = require("../models/Competition");
const Order = require("../models/Order");
const Portfolio = require("../models/Portfolio");
const mongoose = require("mongoose");
const { syncNseEquityInstruments } = require("../services/instrumentService");
const { cleanupTestingData } = require("../services/testingDataCleanupService");
const { testingAccountFilter } = require("../utils/testData");

const getUsers = async (req, res, next) => {
  try {
    const users = await User.find(testingAccountFilter)
      .select("name email role balance createdAt")
      .lean();
    const userIds = users.map((user) => user._id);
    const holdingAgg = await Portfolio.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: "$userId",
          holdingsCount: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          holdingsCost: { $sum: "$totalInvested" }
        }
      }
    ]);
    const holdingsByUser = holdingAgg.reduce((acc, item) => {
      acc[String(item._id)] = item;
      return acc;
    }, {});

    return res.json(
      users.map((user) => {
        const holding = holdingsByUser[String(user._id)] || {};
        const availableCash = Number(user.balance) || 0;
        const holdingsCost = Number(holding.holdingsCost) || 0;
        return {
          ...user,
          availableCash,
          holdingsCount: Number(holding.holdingsCount) || 0,
          totalQuantity: Number(holding.totalQuantity) || 0,
          holdingsCost,
          estimatedEquity: availableCash + holdingsCost
        };
      })
    );
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

const updateUserBalance = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const balance = Number(req.body.balance);
    if (!Number.isFinite(balance) || balance < 0) {
      return res.status(400).json({ message: "Enter a valid non-negative balance" });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { balance },
      { new: true, select: "name email role balance createdAt" }
    ).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const holdings = await Portfolio.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: "$userId",
          holdingsCount: { $sum: 1 },
          totalQuantity: { $sum: "$quantity" },
          holdingsCost: { $sum: "$totalInvested" }
        }
      }
    ]);
    const holding = holdings[0] || {};
    return res.json({
      ...user,
      availableCash: Number(user.balance) || 0,
      holdingsCount: Number(holding.holdingsCount) || 0,
      totalQuantity: Number(holding.totalQuantity) || 0,
      holdingsCost: Number(holding.holdingsCost) || 0,
      estimatedEquity: (Number(user.balance) || 0) + (Number(holding.holdingsCost) || 0)
    });
  } catch (err) {
    return next(err);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 500)
      : 500;

    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("userId", "name email")
      .lean();

    return res.json(
      orders.map((order) => ({
        _id: order._id,
        id: order._id,
        user: order.userId
          ? {
              name: order.userId.name,
              email: order.userId.email
            }
          : null,
        userName: order.userId?.name || "",
        userEmail: order.userId?.email || "",
        symbol: order.symbol,
        companyName: order.companyName,
        orderType: order.orderType,
        side: order.side,
        quantity: order.quantity,
        price: order.executionPrice ?? order.limitPrice ?? order.triggerPrice ?? null,
        triggerPrice: order.triggerPrice,
        limitPrice: order.limitPrice,
        executionPrice: order.executionPrice,
        status: order.status,
        rejectionReason: order.rejectionReason || "",
        cancellationReason: order.cancellationReason || "",
        submittedAt: order.submittedAt,
        stopTriggeredAt: order.stopTriggeredAt,
        executedAt: order.executedAt,
        cancelledAt: order.cancelledAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }))
    );
  } catch (err) {
    return next(err);
  }
};

const createCompetition = async (req, res, next) => {
  try {
    const { name, description = "", startDate, endDate, startingBalance, status = "upcoming" } = req.body;
    if (!name || !startDate || !endDate || !startingBalance) {
      return res.status(400).json({ message: "Missing fields" });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ message: "End date must be after start date" });
    }
    const competition = await Competition.create({
      name,
      description,
      startDate,
      endDate,
      startingBalance,
      status
    });
    return res.status(201).json(competition);
  } catch (err) {
    return next(err);
  }
};

const getCompetitions = async (req, res, next) => {
  try {
    const competitions = await Competition.find()
      .sort({ startDate: -1 })
      .select("name description startDate endDate startingBalance status archived participants createdAt")
      .lean();

    return res.json(
      competitions.map((competition) => ({
        _id: competition._id,
        name: competition.name,
        description: competition.description,
        startDate: competition.startDate,
        endDate: competition.endDate,
        startingBalance: competition.startingBalance,
        status: competition.status,
        archived: Boolean(competition.archived),
        participantCount: competition.participants?.length || 0,
        createdAt: competition.createdAt
      }))
    );
  } catch (err) {
    return next(err);
  }
};

const archiveCompetition = async (req, res, next) => {
  try {
    if (!require("mongoose").Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid competition id" });
    }

    const competition = await Competition.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );

    if (!competition) {
      return res.status(404).json({ message: "Competition not found" });
    }

    return res.json({ message: "Competition archived" });
  } catch (err) {
    return next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const [users, transactions, orders] = await Promise.all([
      User.countDocuments(testingAccountFilter),
      Transaction.countDocuments(),
      Order.countDocuments()
    ]);
    const [volumeAgg, orderStatusAgg, transactionTypeAgg] = await Promise.all([
      Transaction.aggregate([
        { $group: { _id: null, tradingVolume: { $sum: "$total" } } }
      ]),
      Order.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]),
      Transaction.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ])
    ]);
    const totalBalanceAgg = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$balance" } } }
    ]);
    const totalBalance = totalBalanceAgg[0] ? totalBalanceAgg[0].total : 0;
    const orderStatuses = orderStatusAgg.reduce((acc, item) => {
      acc[item._id || "Unknown"] = item.count;
      return acc;
    }, {});
    const transactionTypes = transactionTypeAgg.reduce((acc, item) => {
      acc[item._id || "Unknown"] = item.count;
      return acc;
    }, {});

    return res.json({
      totalUsers: users,
      totalTransactions: transactions,
      totalOrders: orders,
      totalVirtualMoney: totalBalance,
      tradingVolume: volumeAgg[0]?.tradingVolume || 0,
      buyCount: transactionTypes.BUY || 0,
      sellCount: transactionTypes.SELL || 0,
      orderStatuses
    });
  } catch (err) {
    return next(err);
  }
};

const cleanupTestingRecords = async (req, res, next) => {
  try {
    const result = await cleanupTestingData();
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

const syncInstruments = async (req, res, next) => {
  try {
    const result = await syncNseEquityInstruments();
    return res.json(result);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  getUsers,
  updateUserBalance,
  getTransactions,
  getOrders,
  createCompetition,
  getCompetitions,
  archiveCompetition,
  getStats,
  cleanupTestingRecords,
  syncInstruments
};
