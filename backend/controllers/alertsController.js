const Alert = require("../models/Alert");
const mongoose = require("mongoose");
const { getQuote } = require("../utils/market");

const ALLOWED_CONDITIONS = ["above", "below"];

const getAlerts = async (req, res, next) => {
  try {
    const alerts = await Alert.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return res.json(alerts);
  } catch (err) {
    return next(err);
  }
};

const createAlert = async (req, res, next) => {
  try {
    const { symbol, targetPrice, condition } = req.body;
    if (!symbol || targetPrice === undefined || targetPrice === null || !condition) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const normalizedSymbol = String(symbol).trim().toUpperCase();
    const parsedTargetPrice = Number(targetPrice);
    const normalizedCondition = String(condition).trim().toLowerCase();

    if (!/^[A-Z0-9&.-]+\.NS$/.test(normalizedSymbol)) {
      return res.status(400).json({ message: "Invalid or unsupported symbol" });
    }

    if (!Number.isFinite(parsedTargetPrice) || parsedTargetPrice <= 0) {
      return res.status(400).json({ message: "Target price must be greater than 0" });
    }

    if (!ALLOWED_CONDITIONS.includes(normalizedCondition)) {
      return res.status(400).json({ message: "Unsupported alert condition" });
    }

    const quote = await getQuote(normalizedSymbol).catch(() => null);
    if (!quote || !Number.isFinite(Number(quote.c))) {
      return res.status(400).json({ message: "Invalid or unsupported symbol" });
    }

    const alert = await Alert.create({
      userId: req.user.id,
      symbol: normalizedSymbol,
      targetPrice: parsedTargetPrice,
      condition: normalizedCondition
    });
    return res.status(201).json(alert);
  } catch (err) {
    return next(err);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid alert id" });
    }
    const result = await Alert.deleteOne({ _id: req.params.id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Alert not found" });
    }
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getAlerts, createAlert, deleteAlert };
