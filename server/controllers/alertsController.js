const Alert = require("../models/Alert");

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
    if (!symbol || !targetPrice || !condition) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const alert = await Alert.create({
      userId: req.user.id,
      symbol: symbol.toUpperCase(),
      targetPrice,
      condition
    });
    return res.status(201).json(alert);
  } catch (err) {
    return next(err);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    await Alert.deleteOne({ _id: req.params.id, userId: req.user.id });
    return res.json({ message: "Deleted" });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getAlerts, createAlert, deleteAlert };
