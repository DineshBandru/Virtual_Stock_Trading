const { placeOrder } = require("../services/orderService");

const buy = async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const result = await placeOrder({
      userId: req.user.id,
      symbol,
      quantity: Number(quantity),
      side: "BUY",
      orderType: "MARKET"
    });

    if (!result.execution) {
      return res.status(400).json({ message: result.order?.rejectionReason || "Order failed" });
    }

    return res.json({
      balance: result.execution.balance,
      holding: result.execution.holding,
      order: result.order
    });
  } catch (err) {
    return next(err);
  }
};

const sell = async (req, res, next) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid quantity" });
    }

    const result = await placeOrder({
      userId: req.user.id,
      symbol,
      quantity: Number(quantity),
      side: "SELL",
      orderType: "MARKET"
    });

    if (!result.execution) {
      return res.status(400).json({ message: result.order?.rejectionReason || "Order failed" });
    }

    return res.json({ balance: result.execution.balance, order: result.order });
  } catch (err) {
    return next(err);
  }
};

module.exports = { buy, sell };
