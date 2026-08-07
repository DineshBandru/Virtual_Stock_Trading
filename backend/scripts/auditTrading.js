const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const User = require("../models/User");
const Order = require("../models/Order");
const Transaction = require("../models/Transaction");
const Portfolio = require("../models/Portfolio");
const Competition = require("../models/Competition");

const VALID_STATUSES = new Set(["Pending", "Triggered", "Executed", "Cancelled", "Rejected"]);
const NSE_SYMBOL_RE = /^[A-Z0-9&.-]+\.NS$/;

const id = (value) => value?.toString();

const groupBy = (items, keyFn) =>
  items.reduce((map, item) => {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
    return map;
  }, new Map());

const buildTransactionQuantityMap = (transactions) => {
  const summaries = new Map();

  [...transactions]
    .sort((left, right) => new Date(left.timestamp || left.createdAt) - new Date(right.timestamp || right.createdAt))
    .forEach((transaction) => {
      const key = `${id(transaction.userId)}:${transaction.symbol}`;
      const current = summaries.get(key) || {
        userId: id(transaction.userId),
        symbol: transaction.symbol,
        quantity: 0,
        buyQty: 0,
        sellQty: 0
      };
      const quantity = Number(transaction.quantity) || 0;
      if (transaction.type === "BUY") {
        current.quantity += quantity;
        current.buyQty += quantity;
      }
      if (transaction.type === "SELL") {
        current.quantity -= quantity;
        current.sellQty += quantity;
      }
      summaries.set(key, current);
    });

  return summaries;
};

const main = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000
  });

  const [users, orders, transactions, holdings, competitions] = await Promise.all([
    User.find().select("_id role balance").lean(),
    Order.find().lean(),
    Transaction.find().lean(),
    Portfolio.find().lean(),
    Competition.find().lean()
  ]);

  const userIds = new Set(users.map((user) => id(user._id)));
  const orderById = new Map(orders.map((order) => [id(order._id), order]));
  const linkedTransactions = transactions.filter((transaction) => transaction.orderId);
  const transactionsByOrder = groupBy(linkedTransactions, (transaction) => id(transaction.orderId));
  const txQuantityMap = buildTransactionQuantityMap(transactions);

  const executedOrdersWithoutTransactions = orders
    .filter((order) => order.status === "Executed")
    .filter((order) => (transactionsByOrder.get(id(order._id)) || []).length !== 1)
    .map((order) => id(order._id));

  const transactionsWithoutValidExecutedOrders = linkedTransactions
    .filter((transaction) => {
      const order = orderById.get(id(transaction.orderId));
      return !order || order.status !== "Executed";
    })
    .map((transaction) => id(transaction._id));

  const duplicateTransactions = Array.from(transactionsByOrder.entries())
    .filter(([, items]) => items.length > 1)
    .map(([orderId, items]) => ({ orderId, transactionIds: items.map((item) => id(item._id)) }));

  const negativeBalances = users
    .filter((user) => Number(user.balance) < 0)
    .map((user) => id(user._id));

  const negativeHoldings = holdings
    .filter((holding) => Number(holding.quantity) <= 0 || Number(holding.avgBuyPrice) <= 0 || Number(holding.totalInvested) < 0)
    .map((holding) => id(holding._id));

  const duplicateHoldings = Array.from(groupBy(holdings, (holding) => `${id(holding.userId)}:${holding.symbol}`).entries())
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({ key, holdingIds: items.map((item) => id(item._id)) }));

  const portfolioPositionMismatches = holdings
    .map((holding) => {
      const key = `${id(holding.userId)}:${holding.symbol}`;
      const txSummary = txQuantityMap.get(key);
      const transactionQuantity = Number(txSummary?.quantity || 0);
      const holdingQuantity = Number(holding.quantity || 0);
      return Math.abs(transactionQuantity - holdingQuantity) > 1e-8
        ? {
            userId: id(holding.userId),
            symbol: holding.symbol,
            holdingQuantity,
            transactionQuantity,
            holdingId: id(holding._id)
          }
        : null;
    })
    .filter(Boolean);

  const closedPositionsWithActiveQuantity = Array.from(txQuantityMap.values())
    .filter((summary) => summary.quantity <= 0)
    .filter((summary) => holdings.some((holding) =>
      id(holding.userId) === summary.userId &&
      holding.symbol === summary.symbol &&
      Number(holding.quantity) > 0
    ));

  const invalidFinancialMutations = linkedTransactions
    .filter((transaction) => {
      const order = orderById.get(id(transaction.orderId));
      return order && order.status !== "Executed";
    })
    .map((transaction) => ({
      transactionId: id(transaction._id),
      orderId: id(transaction.orderId),
      orderStatus: orderById.get(id(transaction.orderId))?.status
    }));

  const invalidSymbols = {
    orders: orders.filter((order) => !NSE_SYMBOL_RE.test(order.symbol)).map((order) => id(order._id)),
    transactions: transactions.filter((transaction) => !NSE_SYMBOL_RE.test(transaction.symbol)).map((transaction) => id(transaction._id)),
    holdings: holdings.filter((holding) => !NSE_SYMBOL_RE.test(holding.symbol)).map((holding) => id(holding._id))
  };

  const ownershipMismatches = [
    ...orders
      .filter((order) => !userIds.has(id(order.userId)))
      .map((order) => ({ collection: "orders", recordId: id(order._id), userId: id(order.userId) })),
    ...transactions
      .filter((transaction) => !userIds.has(id(transaction.userId)))
      .map((transaction) => ({ collection: "transactions", recordId: id(transaction._id), userId: id(transaction.userId) })),
    ...holdings
      .filter((holding) => !userIds.has(id(holding.userId)))
      .map((holding) => ({ collection: "portfolio", recordId: id(holding._id), userId: id(holding.userId) })),
    ...linkedTransactions
      .filter((transaction) => {
        const order = orderById.get(id(transaction.orderId));
        return order && id(order.userId) !== id(transaction.userId);
      })
      .map((transaction) => ({
        collection: "transactions",
        recordId: id(transaction._id),
        orderId: id(transaction.orderId),
        transactionUserId: id(transaction.userId),
        orderUserId: id(orderById.get(id(transaction.orderId))?.userId)
      }))
  ];

  const statusIssues = orders
    .filter((order) => !VALID_STATUSES.has(order.status))
    .map((order) => ({ orderId: id(order._id), status: order.status }));

  const competitionDuplicateParticipants = competitions
    .map((competition) => {
      const participants = competition.participants || [];
      const grouped = groupBy(participants, (participant) => id(participant.userId));
      const duplicates = Array.from(grouped.entries())
        .filter(([, items]) => items.length > 1)
        .map(([userId, items]) => ({ userId, count: items.length }));
      return duplicates.length
        ? { competitionId: id(competition._id), duplicates }
        : null;
    })
    .filter(Boolean);

  const summary = {
    generatedAt: new Date().toISOString(),
    readOnly: true,
    counts: {
      users: users.length,
      orders: orders.length,
      transactions: transactions.length,
      holdings: holdings.length,
      competitions: competitions.length
    },
    issues: {
      executedOrdersWithoutTransactions,
      transactionsWithoutValidExecutedOrders,
      duplicateTransactions,
      negativeBalances,
      negativeHoldings,
      duplicateHoldings,
      portfolioPositionMismatches,
      closedPositionsWithActiveQuantity,
      invalidFinancialMutations,
      invalidSymbols,
      ownershipMismatches,
      statusIssues,
      mainCompetitionMixing: {
        duplicateCompetitionParticipants: competitionDuplicateParticipants,
        note: "Competition model stores participant balances separately from main User.balance and main Portfolio/Transaction collections."
      }
    }
  };

  console.log(JSON.stringify(summary, null, 2));
};

main()
  .catch((error) => {
    console.error(JSON.stringify({ readOnly: true, error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
