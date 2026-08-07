const crypto = require("crypto");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const User = require("../models/User");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const { getQuote, ensureNseSymbol } = require("../utils/market");
const { findActiveInstrument, normalizeMarketSymbol } = require("./instrumentService");
const { getMarketSession, isExecutableQuote } = require("./marketSessionService");
const { emitEvent } = require("../socket");

const ORDER_TYPES = ["MARKET", "LIMIT", "STOP_LOSS", "STOP_LIMIT"];
const ORDER_SIDES = ["BUY", "SELL"];
const CANCELLABLE_STATUSES = ["Pending", "Triggered"];
const PROCESSABLE_STATUSES = ["Pending", "Triggered"];
const PROCESSING_TIMEOUT_MS = Number(process.env.ORDER_PROCESSING_TIMEOUT_MS || 2 * 60 * 1000);
const EXECUTION_RETRY_LIMIT = Number(process.env.ORDER_EXECUTION_RETRY_LIMIT || 3);

let quoteProvider = getQuote;
let marketSessionProvider = getMarketSession;
let executableQuoteValidator = isExecutableQuote;

const normalizeSymbol = (symbol) => ensureNseSymbol(String(symbol || "").trim());

const clearProcessing = {
  processingToken: "",
  processingStartedAt: ""
};

const getClaimableProcessingFilter = () => ({
  $or: [
    { processingToken: { $exists: false } },
    { processingToken: null },
    { processingToken: "" },
    { processingStartedAt: { $exists: false } },
    { processingStartedAt: { $lt: new Date(Date.now() - PROCESSING_TIMEOUT_MS) } }
  ]
});

const emitOrderEvents = (order) => {
  if (!order) return;
  const payload = {
    eventId: `${order._id}:${order.status}`,
    userId: order.userId.toString(),
    orderId: order._id.toString(),
    symbol: order.symbol,
    side: order.side,
    quantity: order.quantity,
    orderType: order.orderType,
    status: order.status,
    price: order.executionPrice,
    reason: order.rejectionReason || order.cancellationReason || ""
  };
  emitEvent("orders:update", payload);
  emitEvent("order-update", payload);
  emitEvent("portfolio-update", payload);
  emitEvent("position-update", payload);
  emitEvent("transaction-update", payload);
  emitEvent("analytics-update", payload);
  if (order.status === "Executed") emitEvent("order-executed", payload);
  if (order.status === "Rejected") emitEvent("order-rejected", payload);
  if (order.status === "Cancelled") emitEvent("order-cancelled", payload);
  if (order.status === "Triggered") emitEvent("order-triggered", payload);
  emitEvent("market-depth:update", { symbol: order.symbol });
};

const createRejectedOrder = async ({
  userId,
  symbol,
  companyName,
  side,
  quantity,
  orderType,
  triggerPrice,
  limitPrice,
  rejectionReason
}) => {
  const order = await Order.create({
    userId,
    symbol: symbol || normalizeSymbol(symbol),
    companyName: companyName || symbol || "Unsupported symbol",
    side,
    quantity,
    orderType,
    triggerPrice: triggerPrice ?? undefined,
    limitPrice: limitPrice ?? undefined,
    status: "Rejected",
    rejectionReason,
    submittedAt: new Date()
  });
  emitOrderEvents(order);
  return { order: await Order.findById(order._id).lean(), execution: null };
};

const validatePriceRules = ({ side, orderType, triggerPrice, limitPrice }) => {
  if (orderType === "LIMIT" && (!Number.isFinite(limitPrice) || limitPrice <= 0)) {
    return "Limit price must be greater than 0";
  }
  if (orderType === "STOP_LOSS" && (!Number.isFinite(triggerPrice) || triggerPrice <= 0)) {
    return "Trigger price must be greater than 0";
  }
  if (orderType === "STOP_LIMIT") {
    if (!Number.isFinite(triggerPrice) || triggerPrice <= 0) return "Trigger price must be greater than 0";
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) return "Limit price must be greater than 0";
    if (side === "BUY" && limitPrice < triggerPrice) {
      return "Buy stop-limit price must be greater than or equal to trigger price";
    }
    if (side === "SELL" && limitPrice > triggerPrice) {
      return "Sell stop-limit price must be less than or equal to trigger price";
    }
  }
  return "";
};

const getLimitCondition = (order, price) => {
  if (!Number.isFinite(price)) return false;
  return order.side === "BUY"
    ? price <= order.limitPrice
    : price >= order.limitPrice;
};

const getStopTriggerCondition = (order, price) => {
  if (!Number.isFinite(price)) return false;
  return order.side === "BUY"
    ? price >= order.triggerPrice
    : price <= order.triggerPrice;
};

const shouldExecuteAtPrice = (order, price) => {
  if (!Number.isFinite(price)) return false;
  if (order.orderType === "MARKET") return true;
  if (order.orderType === "LIMIT") return getLimitCondition(order, price);
  if (order.orderType === "STOP_LOSS") return getStopTriggerCondition(order, price);
  if (order.orderType === "STOP_LIMIT") {
    if (order.status === "Pending") return false;
    return getLimitCondition(order, price);
  }
  return false;
};

const claimOrder = async (orderId) => {
  const processingToken = crypto.randomUUID();
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: { $in: PROCESSABLE_STATUSES },
      ...getClaimableProcessingFilter()
    },
    {
      $set: {
        processingToken,
        processingStartedAt: new Date(),
        lastCheckedAt: new Date()
      }
    },
    { new: true }
  );

  return order ? { order, processingToken } : null;
};

const rejectClaimedOrder = async (orderId, processingToken, rejectionReason, session = null) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, processingToken, status: { $in: PROCESSABLE_STATUSES } },
    {
      $set: {
        status: "Rejected",
        rejectionReason,
        executedQuantity: 0
      },
      $unset: { ...clearProcessing, executionPrice: "", executedAt: "" }
    },
    { new: true, session }
  );
  emitOrderEvents(order);
  return order;
};

const isTransientTransactionError = (error) => {
  if (!error) return false;
  if (typeof error.hasErrorLabel === "function" && error.hasErrorLabel("TransientTransactionError")) return true;
  return error.code === 112 || error.codeName === "WriteConflict";
};

const executeClaimedOrder = async (orderId, quote, processingToken, expectedSymbol = "", retryCount = 0) => {
  const quoteCheck = executableQuoteValidator(quote, new Date(), expectedSymbol);
  if (!quoteCheck.ok) {
    const rejected = await rejectClaimedOrder(orderId, processingToken, quoteCheck.reason);
    return { order: rejected ? rejected.toObject() : null, execution: null };
  }

  const executionPrice = quoteCheck.price;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({ _id: orderId, processingToken }).session(session);
    if (!order || !PROCESSABLE_STATUSES.includes(order.status)) {
      await session.abortTransaction();
      return { order: order ? order.toObject() : null, execution: null };
    }

    if (!shouldExecuteAtPrice(order, executionPrice)) {
      order.processingToken = undefined;
      order.processingStartedAt = undefined;
      await order.save({ session });
      await session.commitTransaction();
      return { order: order.toObject(), execution: null };
    }

    const total = executionPrice * order.quantity;
    let holding = null;
    let user = null;
    let realizedPnL = 0;

    if (order.side === "BUY") {
      const balanceUpdate = await User.updateOne(
        { _id: order.userId, balance: { $gte: total } },
        { $inc: { balance: -total } },
        { session }
      );

      if (balanceUpdate.modifiedCount !== 1) {
        order.status = "Rejected";
        order.rejectionReason = "Insufficient balance";
        order.processingToken = undefined;
        order.processingStartedAt = undefined;
        await order.save({ session });
        await session.commitTransaction();
        emitOrderEvents(order);
        return { order: order.toObject(), execution: null };
      }

      holding = await Portfolio.findOne({ userId: order.userId, symbol: order.symbol }).session(session);
      if (!holding) {
        [holding] = await Portfolio.create(
          [{
            userId: order.userId,
            symbol: order.symbol,
            companyName: order.companyName,
            quantity: order.quantity,
            avgBuyPrice: executionPrice,
            totalInvested: total
          }],
          { session }
        );
      } else {
        const newQty = holding.quantity + order.quantity;
        const newTotal = holding.totalInvested + total;
        holding.quantity = newQty;
        holding.totalInvested = newTotal;
        holding.avgBuyPrice = newTotal / newQty;
        holding.companyName = order.companyName;
        await holding.save({ session });
      }
    } else {
      holding = await Portfolio.findOne({ userId: order.userId, symbol: order.symbol }).session(session);
      if (!holding || holding.quantity < order.quantity) {
        order.status = "Rejected";
        order.rejectionReason = "Not enough shares";
        order.processingToken = undefined;
        order.processingStartedAt = undefined;
        await order.save({ session });
        await session.commitTransaction();
        emitOrderEvents(order);
        return { order: order.toObject(), execution: null };
      }

      const investedReduction = holding.avgBuyPrice * order.quantity;
      realizedPnL = (executionPrice - holding.avgBuyPrice) * order.quantity;
      holding.quantity -= order.quantity;
      holding.totalInvested = Math.max(0, holding.totalInvested - investedReduction);
      if (holding.quantity === 0) {
        await holding.deleteOne({ session });
      } else {
        await holding.save({ session });
      }

      await User.updateOne({ _id: order.userId }, { $inc: { balance: total } }, { session });
    }

    user = await User.findById(order.userId).session(session);
    await Transaction.create(
      [{
        userId: order.userId,
        orderId: order._id,
        type: order.side,
        symbol: order.symbol,
        companyName: order.companyName,
        quantity: order.quantity,
        price: executionPrice,
        total,
        realizedPnL
      }],
      { session }
    );

    order.status = "Executed";
    order.executionPrice = executionPrice;
    order.executedQuantity = order.quantity;
    order.executedAt = new Date();
    order.rejectionReason = undefined;
    order.processingToken = undefined;
    order.processingStartedAt = undefined;
    await order.save({ session });

    await session.commitTransaction();
    emitOrderEvents(order);
    return { order: order.toObject(), execution: { order: order.toObject(), balance: user.balance, holding } };
  } catch (error) {
    await session.abortTransaction();
    await Order.updateOne({ _id: orderId, processingToken }, { $unset: clearProcessing }).catch(() => {});
    if (retryCount < EXECUTION_RETRY_LIMIT && isTransientTransactionError(error)) {
      const claimed = await claimOrder(orderId);
      if (claimed) {
        return executeClaimedOrder(orderId, quote, claimed.processingToken, expectedSymbol, retryCount + 1);
      }
      const order = await Order.findById(orderId).lean();
      return { order, execution: null };
    }
    throw error;
  } finally {
    session.endSession();
  }
};

const maybeTriggerStopLimit = async (order, price) => {
  if (order.orderType !== "STOP_LIMIT" || order.status !== "Pending") return order;
  if (!getStopTriggerCondition(order, price)) return order;

  order.status = "Triggered";
  order.stopTriggeredAt = new Date();
  order.lastCheckedAt = new Date();
  await order.save();
  emitOrderEvents(order);
  return order;
};

const prevalidateSubmittedOrder = async ({ userId, side, quantity, orderType, limitPrice, triggerPrice, instrument }) => {
  if (!ORDER_SIDES.includes(side)) return "Unsupported order side";
  if (!ORDER_TYPES.includes(orderType)) return "Unsupported order type";
  if (!Number.isInteger(quantity) || quantity <= 0) return "Quantity must be a positive whole number";

  const priceError = validatePriceRules({ side, orderType, triggerPrice, limitPrice });
  if (priceError) return priceError;

  if (side === "SELL") {
    const holding = await Portfolio.findOne({ userId, symbol: instrument.symbol }).lean();
    if (!holding || holding.quantity < quantity) return "Not enough shares";
  }

  if (side === "BUY") {
    const user = await User.findById(userId).select("balance").lean();
    const maxPrice = orderType === "LIMIT" || orderType === "STOP_LIMIT"
      ? limitPrice
      : orderType === "STOP_LOSS"
        ? triggerPrice
        : null;
    if (Number.isFinite(maxPrice) && user && user.balance < maxPrice * quantity) {
      return "Insufficient balance";
    }
  }

  return "";
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
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const instrument = await findActiveInstrument(normalizedSymbol);
  if (!instrument) {
    return createRejectedOrder({
      userId,
      symbol: normalizedSymbol || normalizeSymbol(symbol),
      companyName: normalizedSymbol || "Unsupported symbol",
      side,
      quantity,
      orderType,
      triggerPrice,
      limitPrice,
      rejectionReason: "Invalid or unsupported NSE equity symbol"
    });
  }

  const validationError = await prevalidateSubmittedOrder({
    userId,
    side,
    quantity,
    orderType,
    limitPrice,
    triggerPrice,
    instrument
  });
  if (validationError) {
    return createRejectedOrder({
      userId,
      symbol: instrument.symbol,
      companyName: instrument.companyName,
      side,
      quantity,
      orderType,
      triggerPrice,
      limitPrice,
      rejectionReason: validationError
    });
  }

  const order = await Order.create({
    userId,
    symbol: instrument.symbol,
    companyName: instrument.companyName,
    side,
    quantity,
    orderType,
    triggerPrice: triggerPrice ?? undefined,
    limitPrice: limitPrice ?? undefined,
    status: "Pending",
    submittedAt: new Date()
  });

  const marketSession = marketSessionProvider();
  if (!marketSession.open) {
    emitOrderEvents(order);
    return {
      order: await Order.findById(order._id).lean(),
      execution: null,
      marketSession,
      message: `${marketSession.reason}. Order queued for the next market session.`
    };
  }

  const quote = await quoteProvider(instrument.symbol).catch(() => null);
  const quoteCheck = executableQuoteValidator(quote, new Date(), instrument.symbol);
  if (!quoteCheck.ok) {
    if (orderType === "MARKET") {
      const claimed = await claimOrder(order._id);
      if (claimed) {
        return executeClaimedOrder(order._id, quote, claimed.processingToken, instrument.symbol);
      }
    }
    emitOrderEvents(order);
    return { order: await Order.findById(order._id).lean(), execution: null, marketSession };
  }

  let refreshed = order;
  if (orderType === "STOP_LIMIT") {
    refreshed = await maybeTriggerStopLimit(order, quoteCheck.price);
  }

  if (shouldExecuteAtPrice(refreshed, quoteCheck.price)) {
    const claimed = await claimOrder(refreshed._id);
    if (claimed) {
      return executeClaimedOrder(refreshed._id, quote, claimed.processingToken, instrument.symbol);
    }
  }

  emitOrderEvents(refreshed);
  return { order: await Order.findById(order._id).lean(), execution: null, marketSession };
};

const cancelOrder = async (userId, orderId, cancellationReason = "Cancelled by user") => {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      userId,
      status: { $in: CANCELLABLE_STATUSES },
      ...getClaimableProcessingFilter()
    },
    {
      $set: {
        status: "Cancelled",
        cancelledAt: new Date(),
        cancellationReason
      },
      $unset: clearProcessing
    },
    { new: true }
  );
  if (!order) return null;
  emitOrderEvents(order);
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
  const marketSession = marketSessionProvider();
  if (!marketSession.open) {
    return { processed: 0, skipped: 0, rejected: 0, reason: marketSession.reason };
  }

  const orders = await Order.find({ status: { $in: PROCESSABLE_STATUSES } }).sort({ createdAt: 1 });
  if (orders.length === 0) return { processed: 0, skipped: 0, rejected: 0 };

  const symbols = [...new Set(orders.map((order) => order.symbol))];
  const quotes = await Promise.all(symbols.map((item) => quoteProvider(item).catch(() => null)));
  const quoteMap = new Map(symbols.map((symbol, index) => [symbol, quotes[index]]));

  let processed = 0;
  let skipped = 0;
  let rejected = 0;

  for (const order of orders) {
    try {
      const quote = quoteMap.get(order.symbol);
      const quoteCheck = executableQuoteValidator(quote, new Date(), order.symbol);
      if (!quoteCheck.ok) {
        if (order.orderType === "MARKET") {
          const claimed = await claimOrder(order._id);
          if (claimed) {
            const result = await executeClaimedOrder(order._id, quote, claimed.processingToken, order.symbol);
            if (result.order?.status === "Rejected") rejected += 1;
          }
        } else {
          skipped += 1;
        }
        continue;
      }

      let currentOrder = order;
      if (currentOrder.orderType === "STOP_LIMIT") {
        currentOrder = await maybeTriggerStopLimit(currentOrder, quoteCheck.price);
      }

      if (!shouldExecuteAtPrice(currentOrder, quoteCheck.price)) {
        skipped += 1;
        await Order.updateOne({ _id: currentOrder._id }, { $set: { lastCheckedAt: new Date() } });
        continue;
      }

      const claimed = await claimOrder(currentOrder._id);
      if (!claimed) {
        skipped += 1;
        continue;
      }
      const result = await executeClaimedOrder(currentOrder._id, quote, claimed.processingToken, currentOrder.symbol);
      if (result.order?.status === "Executed") processed += 1;
      else if (result.order?.status === "Rejected") rejected += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
    }
  }

  return { processed, skipped, rejected };
};

let processorHandle = null;
let processorRunning = false;
const startOrderProcessor = () => {
  if (processorHandle) return processorHandle;

  processorHandle = setInterval(() => {
    if (processorRunning) return;
    processorRunning = true;
    processPendingOrders()
      .catch(() => {})
      .finally(() => {
        processorRunning = false;
      });
  }, 15000);

  return processorHandle;
};

const __setOrderServiceTestHooks = (hooks = {}) => {
  if (hooks.getQuote) quoteProvider = hooks.getQuote;
  if (hooks.getMarketSession) marketSessionProvider = hooks.getMarketSession;
  if (hooks.isExecutableQuote) executableQuoteValidator = hooks.isExecutableQuote;
};

const __resetOrderServiceTestHooks = () => {
  quoteProvider = getQuote;
  marketSessionProvider = getMarketSession;
  executableQuoteValidator = isExecutableQuote;
};

module.exports = {
  ORDER_SIDES,
  ORDER_TYPES,
  placeOrder,
  cancelOrder,
  getOrders,
  getOrderById,
  processPendingOrders,
  startOrderProcessor,
  __setOrderServiceTestHooks,
  __resetOrderServiceTestHooks
};
