const Order = require("../models/Order");
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const { getQuote, getProfile } = require("../utils/market");
const { emitEvent } = require("../socket");

const ORDER_TYPES = ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LIMIT"];
const ORDER_SIDES = ["BUY", "SELL"];

const normalizeSymbol = (symbol) => symbol.trim().toUpperCase();

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getOrderFillCondition = (order, price) => {
  if (!Number.isFinite(price)) {
    return false;
  }

  if (order.orderType === "MARKET") {
    return true;
  }

  if (order.orderType === "LIMIT") {
    return order.side === "BUY"
      ? price <= order.limitPrice
      : price >= order.limitPrice;
  }

  if (order.orderType === "STOP_LOSS") {
    return order.side === "BUY"
      ? price >= order.triggerPrice
      : price <= order.triggerPrice;
  }

  if (order.orderType === "STOP_LIMIT") {
    if (!order.stopTriggeredAt) {
      return false;
    }

    return order.side === "BUY"
      ? price <= order.limitPrice
      : price >= order.limitPrice;
  }

  return false;
};

const setRejected = async (order, rejectionReason) => {
  order.status = "Rejected";
  order.rejectionReason = rejectionReason;
  order.executionPrice = undefined;
  order.executedAt = undefined;
  await order.save();
  emitEvent("orders:update", { userId: order.userId.toString(), orderId: order._id.toString() });
  emitEvent("market-depth:update", { symbol: order.symbol });
  return order;
};

const executeBuyOrder = async (order, executionPrice, companyName) => {
  const user = await User.findById(order.userId);
  if (!user) {
    return setRejected(order, "User not found");
  }

  const totalCost = executionPrice * order.quantity;
  if (user.balance < totalCost) {
    return setRejected(order, "Insufficient balance");
  }

  let holding = await Portfolio.findOne({ userId: user._id, symbol: order.symbol });
  if (!holding) {
    holding = await Portfolio.create({
      userId: user._id,
      symbol: order.symbol,
      companyName,
      quantity: order.quantity,
      avgBuyPrice: executionPrice,
      totalInvested: totalCost
    });
  } else {
    const newQty = holding.quantity + order.quantity;
    const newTotal = holding.totalInvested + totalCost;
    holding.quantity = newQty;
    holding.totalInvested = newTotal;
    holding.avgBuyPrice = newTotal / newQty;
    holding.companyName = companyName;
    await holding.save();
  }

  user.balance -= totalCost;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "BUY",
    symbol: order.symbol,
    companyName,
    quantity: order.quantity,
    price: executionPrice,
    total: totalCost
  });

  order.status = "Executed";
  order.executionPrice = executionPrice;
  order.executedAt = new Date();
  order.rejectionReason = undefined;
  await order.save();
  emitEvent("orders:update", { userId: order.userId.toString(), orderId: order._id.toString() });
  emitEvent("market-depth:update", { symbol: order.symbol });

  return { order, balance: user.balance, holding };
};

const executeSellOrder = async (order, executionPrice, companyName) => {
  const [user, holding] = await Promise.all([
    User.findById(order.userId),
    Portfolio.findOne({ userId: order.userId, symbol: order.symbol })
  ]);

  if (!user) {
    return setRejected(order, "User not found");
  }

  if (!holding || holding.quantity < order.quantity) {
    return setRejected(order, "Not enough shares");
  }

  const totalReturn = executionPrice * order.quantity;
  const investedReduction = holding.avgBuyPrice * order.quantity;

  holding.quantity -= order.quantity;
  holding.totalInvested = Math.max(0, holding.totalInvested - investedReduction);
  if (holding.quantity === 0) {
    await holding.deleteOne();
  } else {
    await holding.save();
  }

  user.balance += totalReturn;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "SELL",
    symbol: order.symbol,
    companyName,
    quantity: order.quantity,
    price: executionPrice,
    total: totalReturn
  });

  order.status = "Executed";
  order.executionPrice = executionPrice;
  order.executedAt = new Date();
  order.rejectionReason = undefined;
  await order.save();
  emitEvent("orders:update", { userId: order.userId.toString(), orderId: order._id.toString() });
  emitEvent("market-depth:update", { symbol: order.symbol });

  return { order, balance: user.balance };
};

const executeOrder = async (order, quote, companyName) => {
  if (!quote || !Number.isFinite(quote.c)) {
    return setRejected(order, "Price unavailable");
  }

  const executionPrice = quote.c;
  return order.side === "BUY"
    ? executeBuyOrder(order, executionPrice, companyName)
    : executeSellOrder(order, executionPrice, companyName);
};

const evaluateStopLimitActivation = async (order, price) => {
  if (order.stopTriggeredAt) {
    return order;
  }

  const triggered = order.side === "BUY"
    ? price >= order.triggerPrice
    : price <= order.triggerPrice;

  if (!triggered) {
    return order;
  }

  order.stopTriggeredAt = new Date();
  await order.save();
  emitEvent("orders:update", { userId: order.userId.toString(), orderId: order._id.toString() });
  emitEvent("market-depth:update", { symbol: order.symbol });
  return order;
};

const placeOrder = async ({
  userId,
  symbol,
  quantity,
  side,
  orderType,
  triggerPrice,
  limitPrice
}) => {
  const normalizedSymbol = normalizeSymbol(symbol);
  const profile = await getProfile(normalizedSymbol).catch(() => null);
  const companyName = profile?.name || normalizedSymbol;

  const order = await Order.create({
    userId,
    symbol: normalizedSymbol,
    companyName,
    side,
    quantity,
    orderType,
    triggerPrice: triggerPrice ?? undefined,
    limitPrice: limitPrice ?? undefined,
    status: "Pending"
  });

  const quote = await getQuote(normalizedSymbol).catch(() => null);
  if (orderType === "MARKET") {
    if (!quote || !Number.isFinite(quote.c)) {
      await setRejected(order, "Price unavailable");
      return { order: await Order.findById(order._id).lean(), execution: null };
    }

    const execution = await executeOrder(order, quote, companyName);
    return { order: await Order.findById(order._id).lean(), execution };
  }

  if (quote && Number.isFinite(quote.c)) {
    const currentPrice = quote.c;
    if (orderType === "LIMIT" && getOrderFillCondition(order, currentPrice)) {
      const execution = await executeOrder(order, quote, companyName);
      return { order: await Order.findById(order._id).lean(), execution };
    }

    if (orderType === "STOP_LOSS" && getOrderFillCondition(order, currentPrice)) {
      const execution = await executeOrder(order, quote, companyName);
      return { order: await Order.findById(order._id).lean(), execution };
    }

    if (orderType === "STOP_LIMIT") {
      await evaluateStopLimitActivation(order, currentPrice);
      const refreshed = await Order.findById(order._id);
      if (getOrderFillCondition(refreshed, currentPrice)) {
        const execution = await executeOrder(refreshed, quote, companyName);
        return { order: await Order.findById(order._id).lean(), execution };
      }
    }
  }

  emitEvent("market-depth:update", { symbol: normalizedSymbol });
  return { order: await Order.findById(order._id).lean(), execution: null };
};

const cancelOrder = async (userId, orderId) => {
  const order = await Order.findOne({ _id: orderId, userId });
  if (!order) {
    return null;
  }

  if (order.status !== "Pending") {
    throw new Error("Only pending orders can be cancelled");
  }

  order.status = "Cancelled";
  order.executedAt = undefined;
  order.executionPrice = undefined;
  order.rejectionReason = undefined;
  await order.save();
  emitEvent("orders:update", { userId: order.userId.toString(), orderId: order._id.toString() });
  emitEvent("market-depth:update", { symbol: order.symbol });
  return order;
};

const getOrders = async (userId, filters = {}) => {
  const query = { userId };
  if (filters.status) query.status = filters.status;
  if (filters.symbol) query.symbol = normalizeSymbol(filters.symbol);
  if (filters.orderType) query.orderType = filters.orderType;

  return Order.find(query).sort({ createdAt: -1 }).lean();
};

const getOrderById = async (userId, orderId) => {
  return Order.findOne({ _id: orderId, userId }).lean();
};

const processPendingOrders = async () => {
  const orders = await Order.find({ status: "Pending" }).sort({ createdAt: 1 });
  if (orders.length === 0) {
    return { processed: 0 };
  }

  const symbols = [...new Set(orders.map((order) => order.symbol))];
  const quotes = await Promise.all(symbols.map((symbol) => getQuote(symbol).catch(() => null)));
  const quoteMap = new Map(symbols.map((symbol, index) => [symbol, quotes[index]]));

  let processed = 0;
  for (const order of orders) {
    const quote = quoteMap.get(order.symbol);
    if (!quote || !Number.isFinite(quote.c)) {
      continue;
    }

    const price = quote.c;
    if (order.orderType === "LIMIT" && getOrderFillCondition(order, price)) {
      await executeOrder(order, quote, order.companyName);
      processed += 1;
      continue;
    }

    if (order.orderType === "STOP_LOSS" && getOrderFillCondition(order, price)) {
      await executeOrder(order, quote, order.companyName);
      processed += 1;
      continue;
    }

    if (order.orderType === "STOP_LIMIT") {
      await evaluateStopLimitActivation(order, price);
      const refreshed = await Order.findById(order._id);
      if (getOrderFillCondition(refreshed, price)) {
        await executeOrder(refreshed, quote, order.companyName);
        processed += 1;
      }
    }
  }

  return { processed };
};

let processorHandle = null;
const startOrderProcessor = () => {
  if (processorHandle) {
    return processorHandle;
  }

  processorHandle = setInterval(() => {
    processPendingOrders().catch(() => {});
  }, 15000);

  return processorHandle;
};

module.exports = {
  ORDER_SIDES,
  ORDER_TYPES,
  placeOrder,
  cancelOrder,
  getOrders,
  getOrderById,
  processPendingOrders,
  startOrderProcessor
};