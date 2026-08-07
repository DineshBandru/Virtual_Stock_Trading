const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const Order = require("../models/Order");
const Transaction = require("../models/Transaction");

const LEGACY_ORDER_IDS = [
  "6a5b9fa34f08fbfb7ffddeab",
  "6a5ba0c44f08fbfb7ffddf8a",
  "6a5bc5a7fccf0d50ffeb469f",
  "6a5c56507759d3ab9fbda99a",
  "6a5c58acd113f3e06262c921"
];

const APPLY = process.argv.includes("--apply");
const MATCH_WINDOW_MS = 10 * 60 * 1000;

const id = (value) => value?.toString();

const orderTimestamp = (order) =>
  new Date(order.executedAt || order.submittedAt || order.createdAt || 0);

const getRealizedPnLPlan = async (order, transaction) => {
  const hasExistingValue = transaction.realizedPnL !== null && transaction.realizedPnL !== undefined;

  if (order.side === "BUY") {
    return {
      realizedPnLApplicable: false,
      realizedPnLMissing: false,
      realizedPnLAction: "NOT_APPLICABLE",
      existingRealizedPnL: transaction.realizedPnL,
      proposedRealizedPnL: transaction.realizedPnL,
      realizedPnLReason: "BUY transactions do not realize profit or loss"
    };
  }

  if (hasExistingValue) {
    return {
      realizedPnLApplicable: true,
      realizedPnLMissing: false,
      realizedPnLAction: "PRESERVED_EXISTING",
      existingRealizedPnL: transaction.realizedPnL,
      proposedRealizedPnL: transaction.realizedPnL,
      realizedPnLReason: "Existing realizedPnL preserved"
    };
  }

  const priorTransactions = await Transaction.find({
    userId: order.userId,
    symbol: order.symbol,
    timestamp: { $lt: transaction.timestamp || orderTimestamp(order) }
  }).sort({ timestamp: 1, createdAt: 1 }).lean();

  const lots = [];
  for (const item of priorTransactions) {
    if (item.type === "BUY") {
      lots.push({ quantity: Number(item.quantity), price: Number(item.price) });
    }
    if (item.type === "SELL") {
      let remaining = Number(item.quantity);
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const used = Math.min(lot.quantity, remaining);
        lot.quantity -= used;
        remaining -= used;
        if (lot.quantity <= 1e-8) lots.shift();
      }
    }
  }

  let needed = Number(order.quantity);
  let costBasis = 0;
  for (const lot of lots) {
    if (needed <= 0) break;
    const used = Math.min(lot.quantity, needed);
    costBasis += used * lot.price;
    needed -= used;
  }

  if (needed <= 1e-8) {
    return {
      realizedPnLApplicable: true,
      realizedPnLMissing: true,
      realizedPnLAction: "SAFE_TO_BACKFILL",
      existingRealizedPnL: transaction.realizedPnL,
      proposedRealizedPnL: Number((Number(order.executionPrice) * Number(order.quantity) - costBasis).toFixed(8)),
      realizedPnLReason: "Calculated from deterministic prior same-symbol BUY/SELL lots"
    };
  }

  return {
    realizedPnLApplicable: true,
    realizedPnLMissing: true,
    realizedPnLAction: "UNABLE_TO_RECONSTRUCT",
    existingRealizedPnL: transaction.realizedPnL,
    proposedRealizedPnL: transaction.realizedPnL,
    realizedPnLReason: "Insufficient deterministic prior lot history; leaving realizedPnL unchanged"
  };
};

const classifyOrder = async (legacyOrderId, order) => {
  if (!order) {
    return {
      orderId: legacyOrderId,
      classification: "NO_TRANSACTION_FOUND",
      reason: "Order not found",
      safeToRepair: false
    };
  }

  if (order.status !== "Executed") {
    return {
      orderId: id(order._id),
      classification: "NO_TRANSACTION_FOUND",
      reason: `Order status is ${order.status}, not Executed`,
      safeToRepair: false
    };
  }

  const existingLinked = await Transaction.findOne({ orderId: order._id }).lean();
  if (existingLinked) {
    return {
      orderId: id(order._id),
      matchingTransactionId: id(existingLinked._id),
      classification: "LEGACY_MATCH_FOUND",
      reason: "Order already linked",
      safeToRepair: false,
      idempotent: true
    };
  }

  const targetTime = orderTimestamp(order);
  const candidates = await Transaction.find({
    orderId: { $exists: false },
    userId: order.userId,
    symbol: order.symbol,
    type: order.side,
    quantity: order.quantity,
    price: order.executionPrice
  }).lean();

  const timedCandidates = candidates
    .map((transaction) => ({
      transaction,
      timeDiffMs: Math.abs(new Date(transaction.timestamp || transaction.createdAt || 0) - targetTime)
    }))
    .filter((item) => item.timeDiffMs <= MATCH_WINDOW_MS)
    .sort((left, right) => left.timeDiffMs - right.timeDiffMs);

  if (timedCandidates.length === 0) {
    return {
      orderId: id(order._id),
      classification: "NO_TRANSACTION_FOUND",
      reason: "No same user/symbol/side/quantity/price transaction within match window",
      safeToRepair: false
    };
  }

  if (timedCandidates.length > 1) {
    return {
      orderId: id(order._id),
      classification: "AMBIGUOUS_MATCH",
      reason: `${timedCandidates.length} candidate transactions matched`,
      candidateTransactionIds: timedCandidates.map((item) => id(item.transaction._id)),
      safeToRepair: false
    };
  }

  const { transaction, timeDiffMs } = timedCandidates[0];
  const realizedPnLPlan = await getRealizedPnLPlan(order, transaction);

  return {
    orderId: id(order._id),
    matchingTransactionId: id(transaction._id),
    classification: "LEGACY_MATCH_FOUND",
    orderIdMissing: !transaction.orderId,
    existingOrderId: id(transaction.orderId) || null,
    proposedOrderId: id(order._id),
    matchConfidence: "high",
    reason: `Single exact match within ${Math.round(timeDiffMs / 1000)} seconds`,
    ...realizedPnLPlan,
    safeToRepair: !transaction.orderId
  };
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  const orders = await Order.find({ _id: { $in: LEGACY_ORDER_IDS } }).lean();
  const orderMap = new Map(orders.map((order) => [id(order._id), order]));
  const results = [];

  for (const orderId of LEGACY_ORDER_IDS) {
    results.push(await classifyOrder(orderId, orderMap.get(orderId)));
  }

  const repairable = results.filter((item) => item.classification === "LEGACY_MATCH_FOUND" && item.safeToRepair);
  const ambiguous = results.filter((item) => item.classification === "AMBIGUOUS_MATCH");
  const missing = results.filter((item) => item.classification === "NO_TRANSACTION_FOUND");

  const applied = [];
  if (APPLY && ambiguous.length === 0 && missing.length === 0) {
    for (const item of repairable) {
      const update = { orderId: item.proposedOrderId };
      if (item.realizedPnLAction === "SAFE_TO_BACKFILL") {
        update.realizedPnL = item.proposedRealizedPnL;
      }
      const result = await Transaction.updateOne(
        { _id: item.matchingTransactionId, orderId: { $exists: false } },
        { $set: update }
      );
      applied.push({
        orderId: item.orderId,
        transactionId: item.matchingTransactionId,
        modifiedCount: result.modifiedCount
      });
    }
  }

  console.log(JSON.stringify({
    mode: APPLY ? "APPLY" : "DRY_RUN",
    legacyOrderIds: LEGACY_ORDER_IDS,
    proposedCount: repairable.length,
    ambiguousCount: ambiguous.length,
    missingCount: missing.length,
    applyExecuted: APPLY && ambiguous.length === 0 && missing.length === 0,
    results,
    applied
  }, null, 2));
};

main()
  .catch((error) => {
    console.error(JSON.stringify({ error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
