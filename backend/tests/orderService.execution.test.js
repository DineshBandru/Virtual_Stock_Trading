const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const User = require("../models/User");
const Order = require("../models/Order");
const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const Instrument = require("../models/Instrument");
const orderService = require("../services/orderService");
const positionsService = require("../services/positionsService");

const RUN_ID = `order-integrity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const TEST_RECORD_TAG = "__order_test__";
const SYMBOL = "RELIANCE.NS";
const EXTRA_SYMBOL = "TCS.NS";
const COMPANY = "Reliance Industries Limited";
const PASSWORD_HASH = "$2a$10$5Lr/vn8kp0ki8xgJj5cVQ.XiYZTgy91xY8QfLaEoMBoCNpZL0I/6S";
const TEST_DATABASE_NAME = process.env.ORDER_TEST_DB_NAME || "test";
const TEST_INSTRUMENTS = [
  {
    symbol: SYMBOL,
    tradingSymbol: "RELIANCE",
    companyName: COMPANY,
    exchange: "NSE",
    series: "EQ",
    isin: "INE002A01018",
    instrumentType: "EQUITY",
    active: true
  },
  {
    symbol: EXTRA_SYMBOL,
    tradingSymbol: "TCS",
    companyName: "Tata Consultancy Services Limited",
    exchange: "NSE",
    series: "EQ",
    isin: "INE467B01029",
    instrumentType: "EQUITY",
    active: true
  }
];

let seededInstrumentSymbols = [];

const openSession = {
  open: true,
  reason: "Market open",
  exchangeTime: "2026-07-20T10:00:00+05:30",
  dateKey: "2026-07-20",
  timeZone: "Asia/Kolkata"
};

let quotePrice = 100;
let quoteStale = false;
let quoteAvailable = true;

const freshQuote = (price = quotePrice) => ({
  c: price,
  fetchedAt: new Date().toISOString(),
  stale: quoteStale
});

const setQuote = (price, options = {}) => {
  quotePrice = price;
  quoteStale = Boolean(options.stale);
  quoteAvailable = options.available !== false;
};

const connect = async () => {
  const testMongoUri = process.env.TEST_MONGO_URI || process.env.MONGO_URI;
  if (!testMongoUri) {
    throw new Error("TEST_MONGO_URI is required for order execution integration tests");
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testMongoUri, {
      dbName: TEST_DATABASE_NAME,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000
    });
  }

  const databaseName = mongoose.connection.db?.databaseName;
  if (databaseName !== "test") {
    await mongoose.disconnect();
    throw new Error(`Order tests aborted: connected database must be "test", got "${databaseName || "unknown"}"`);
  }
};

const cleanup = async (userIds = []) => {
  if (userIds.length === 0) return;
  await Promise.all([
    Order.deleteMany({ userId: { $in: userIds } }),
    Portfolio.deleteMany({ userId: { $in: userIds } }),
    Transaction.deleteMany({ userId: { $in: userIds } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);
};

const cleanupRunRecords = async () => {
  const users = await User.find({ email: new RegExp(`^${RUN_ID}-`) }).select("_id").lean();
  await cleanup(users.map((user) => user._id));
};

const seedRequiredInstruments = async () => {
  seededInstrumentSymbols = [];
  const now = new Date();

  for (const instrument of TEST_INSTRUMENTS) {
    const existing = await Instrument.findOne({
      exchange: instrument.exchange,
      tradingSymbol: instrument.tradingSymbol
    }).lean();

    if (existing) {
      if (!existing.active || existing.symbol !== instrument.symbol) {
        throw new Error(`Order tests aborted: existing ${instrument.tradingSymbol} instrument is not an active ${instrument.symbol} NSE equity`);
      }
      continue;
    }

    await Instrument.create({
      ...instrument,
      companyName: `${instrument.companyName} ${TEST_RECORD_TAG}`,
      searchText: [
        instrument.tradingSymbol,
        instrument.symbol,
        instrument.companyName,
        instrument.isin,
        TEST_RECORD_TAG
      ].join(" ").toLowerCase(),
      lastSyncedAt: now
    });
    seededInstrumentSymbols.push(instrument.symbol);
  }
};

const cleanupSeededInstruments = async () => {
  if (seededInstrumentSymbols.length === 0) return;
  await Instrument.deleteMany({
    symbol: { $in: seededInstrumentSymbols },
    companyName: new RegExp(TEST_RECORD_TAG)
  });
};

const createUser = async (name, balance = 100000) => {
  const user = await User.create({
    name,
    email: `${RUN_ID}-${name}@example.test`,
    password: PASSWORD_HASH,
    balance
  });
  return user;
};

const getState = async (userId) => {
  const [user, holding, transactions, orders] = await Promise.all([
    User.findById(userId).lean(),
    Portfolio.findOne({ userId, symbol: SYMBOL }).lean(),
    Transaction.find({ userId, symbol: SYMBOL }).sort({ createdAt: 1 }).lean(),
    Order.find({ userId, symbol: SYMBOL }).sort({ createdAt: 1 }).lean()
  ]);
  return { user, holding, transactions, orders };
};

const place = (userId, overrides = {}) =>
  orderService.placeOrder({
    userId,
    symbol: SYMBOL,
    quantity: 1,
    side: "BUY",
    orderType: "MARKET",
    ...overrides
  });

test.before(async () => {
  await connect();
  await cleanupRunRecords();
  await seedRequiredInstruments();
  orderService.__setOrderServiceTestHooks({
    getMarketSession: () => openSession,
    getQuote: async () => (quoteAvailable ? freshQuote() : null)
  });
  positionsService.__setPositionsServiceTestHooks({
    getQuote: async () => freshQuote()
  });
});

test.after(async () => {
  orderService.__resetOrderServiceTestHooks();
  positionsService.__resetPositionsServiceTestHooks();
  if (mongoose.connection.readyState !== 0) {
    await cleanupRunRecords();
    await cleanupSeededInstruments();
    await mongoose.disconnect();
  }
});

test("market buy and sell execute once with correct accounting", async () => {
  const user = await createUser("market", 1000);
  try {
    setQuote(100);
    const buy = await place(user._id, { quantity: 2 });
    assert.equal(buy.order.status, "Executed");
    let state = await getState(user._id);
    assert.equal(state.user.balance, 800);
    assert.equal(state.holding.quantity, 2);
    assert.equal(state.holding.avgBuyPrice, 100);
    assert.equal(state.transactions.length, 1);

    setQuote(115);
    const sell = await place(user._id, { side: "SELL", quantity: 2 });
    assert.equal(sell.order.status, "Executed");
    state = await getState(user._id);
    assert.equal(state.user.balance, 1030);
    assert.equal(state.holding, null);
    assert.equal(state.transactions.length, 2);

    const positions = await positionsService.buildPositions(user._id);
    assert.equal(positions.closedPositions[0].netQty, 0);
    assert.equal(positions.closedPositions[0].realizedPnL, 30);
  } finally {
    await cleanup([user._id]);
  }
});

test("limit buy and limit sell remain pending until price qualifies", async () => {
  const user = await createUser("limit", 1000);
  try {
    setQuote(100);
    const pendingBuy = await place(user._id, { orderType: "LIMIT", limitPrice: 90 });
    assert.equal(pendingBuy.order.status, "Pending");
    setQuote(90);
    assert.equal((await orderService.processPendingOrders()).processed, 1);

    setQuote(100);
    const pendingSell = await place(user._id, { side: "SELL", orderType: "LIMIT", limitPrice: 120 });
    assert.equal(pendingSell.order.status, "Pending");
    setQuote(120);
    assert.equal((await orderService.processPendingOrders()).processed, 1);

    const state = await getState(user._id);
    assert.equal(state.user.balance, 1030);
    assert.equal(state.holding, null);
    assert.equal(state.transactions.length, 2);
  } finally {
    await cleanup([user._id]);
  }
});

test("stop-loss and stop-limit lifecycle trigger and execute correctly", async () => {
  const user = await createUser("stops", 2000);
  try {
    setQuote(100);
    assert.equal((await place(user._id, { quantity: 3 })).order.status, "Executed");

    setQuote(100);
    assert.equal((await place(user._id, { side: "SELL", orderType: "STOP_LOSS", triggerPrice: 90 })).order.status, "Pending");
    setQuote(90);
    assert.equal((await orderService.processPendingOrders()).processed, 1);

    setQuote(100);
    const stopLimit = await place(user._id, {
      side: "SELL",
      orderType: "STOP_LIMIT",
      triggerPrice: 90,
      limitPrice: 88
    });
    assert.equal(stopLimit.order.status, "Pending");
    setQuote(85);
    const triggeredRun = await orderService.processPendingOrders();
    assert.equal(triggeredRun.processed, 0);
    let refreshed = await Order.findById(stopLimit.order._id).lean();
    assert.equal(refreshed.status, "Triggered");

    setQuote(88);
    assert.equal((await orderService.processPendingOrders()).processed, 1);
    refreshed = await Order.findById(stopLimit.order._id).lean();
    assert.equal(refreshed.status, "Executed");
  } finally {
    await cleanup([user._id]);
  }
});

test("pending cancellation blocks later execution", async () => {
  const user = await createUser("cancel", 1000);
  try {
    setQuote(100);
    const result = await place(user._id, { orderType: "LIMIT", limitPrice: 80 });
    assert.equal(result.order.status, "Pending");
    const cancelled = await orderService.cancelOrder(user._id, result.order._id);
    assert.equal(cancelled.status, "Cancelled");
    setQuote(80);
    assert.equal((await orderService.processPendingOrders()).processed, 0);
    const state = await getState(user._id);
    assert.equal(state.transactions.length, 0);
    assert.equal(state.user.balance, 1000);
  } finally {
    await cleanup([user._id]);
  }
});

test("rejects insufficient funds, oversell, stale quote, and closed-market market order queues", async () => {
  const user = await createUser("rejects", 50);
  try {
    setQuote(100);
    assert.equal((await place(user._id)).order.status, "Rejected");
    assert.equal((await place(user._id, { side: "SELL" })).order.status, "Rejected");

    const funded = await createUser("stale", 1000);
    try {
      setQuote(100, { stale: true });
      const staleOrder = await place(funded._id);
      assert.equal(staleOrder.order.status, "Rejected");
    } finally {
      await cleanup([funded._id]);
    }

    orderService.__setOrderServiceTestHooks({
      getMarketSession: () => ({ ...openSession, open: false, reason: "NSE market is closed for test" }),
      getQuote: async () => freshQuote()
    });
    setQuote(100, { stale: false });
    const closedMarketUser = await createUser("closed-market", 1000);
    try {
      const closed = await place(closedMarketUser._id);
      assert.equal(closed.order.status, "Pending");
      assert.match(closed.message, /queued/i);
      const state = await getState(closedMarketUser._id);
      assert.equal(state.transactions.length, 0);
      assert.equal(state.holding, null);
      assert.equal(state.user.balance, 1000);
    } finally {
      await cleanup([closedMarketUser._id]);
    }
  } finally {
    orderService.__setOrderServiceTestHooks({
      getMarketSession: () => openSession,
      getQuote: async () => (quoteAvailable ? freshQuote() : null)
    });
    await cleanup([user._id]);
  }
});

test("simultaneous buys cannot overspend available balance", async () => {
  const user = await createUser("concurrent-buy", 100);
  try {
    setQuote(100);
    const results = await Promise.allSettled([place(user._id), place(user._id)]);
    assert.equal(results.filter((item) => item.status === "fulfilled").length, 2);
    const state = await getState(user._id);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.holding.quantity, 1);
    assert.equal(state.user.balance, 0);
    assert.equal(state.orders.filter((order) => order.status === "Executed").length, 1);
    assert.equal(state.orders.filter((order) => order.status === "Rejected").length, 1);
    assert.equal(state.orders.filter((order) => order.processingToken).length, 0);
  } finally {
    await cleanup([user._id]);
  }
});

test("simultaneous sells cannot oversell holdings", async () => {
  const user = await createUser("concurrent-sell", 1000);
  try {
    setQuote(100);
    assert.equal((await place(user._id)).order.status, "Executed");
    setQuote(110);
    const results = await Promise.allSettled([
      place(user._id, { side: "SELL" }),
      place(user._id, { side: "SELL" })
    ]);
    assert.equal(results.filter((item) => item.status === "fulfilled").length, 2);
    const state = await getState(user._id);
    assert.equal(state.transactions.filter((tx) => tx.type === "SELL").length, 1);
    assert.equal(state.holding, null);
    assert.equal(state.user.balance, 1010);
    assert.equal(state.orders.filter((order) => order.status === "Executed" && order.side === "SELL").length, 1);
    assert.equal(state.orders.filter((order) => order.status === "Rejected" && order.side === "SELL").length, 1);
  } finally {
    await cleanup([user._id]);
  }
});

test("duplicate checker cycles execute an eligible order once", async () => {
  const user = await createUser("duplicate-checker", 1000);
  try {
    setQuote(100);
    const pending = await place(user._id, { orderType: "LIMIT", limitPrice: 90 });
    assert.equal(pending.order.status, "Pending");
    setQuote(90);
    await Promise.all([orderService.processPendingOrders(), orderService.processPendingOrders()]);
    const state = await getState(user._id);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.holding.quantity, 1);
    assert.equal(state.user.balance, 910);
    assert.equal(state.orders.filter((order) => order.status === "Executed").length, 1);
    assert.equal(state.orders.filter((order) => order.processingToken).length, 0);
  } finally {
    await cleanup([user._id]);
  }
});

test("cancellation and execution race ends in one valid state with matching accounting", async () => {
  const user = await createUser("cancel-race", 1000);
  try {
    setQuote(100);
    const pending = await place(user._id, { orderType: "LIMIT", limitPrice: 90 });
    setQuote(90);
    await Promise.allSettled([
      orderService.processPendingOrders(),
      orderService.cancelOrder(user._id, pending.order._id)
    ]);
    const state = await getState(user._id);
    const finalOrder = state.orders.find((order) => order._id.toString() === pending.order._id.toString());
    assert.ok(["Executed", "Cancelled"].includes(finalOrder.status));
    if (finalOrder.status === "Executed") {
      assert.equal(state.transactions.length, 1);
      assert.equal(state.holding.quantity, 1);
      assert.equal(state.user.balance, 910);
    } else {
      assert.equal(state.transactions.length, 0);
      assert.equal(state.holding, null);
      assert.equal(state.user.balance, 1000);
    }
  } finally {
    await cleanup([user._id]);
  }
});

test("stale processing claim is recovered after restart-like interruption", async () => {
  const user = await createUser("restart-recovery", 1000);
  try {
    setQuote(100);
    const pending = await place(user._id, { orderType: "LIMIT", limitPrice: 90 });
    await Order.updateOne(
      { _id: pending.order._id },
      {
        $set: {
          processingToken: "abandoned-claim",
          processingStartedAt: new Date(Date.now() - 10 * 60 * 1000)
        }
      }
    );
    setQuote(90);
    assert.equal((await orderService.processPendingOrders()).processed, 1);
    const state = await getState(user._id);
    assert.equal(state.transactions.length, 1);
    assert.equal(state.holding.quantity, 1);
    assert.equal(state.orders[0].status, "Executed");
    assert.equal(Boolean(state.orders[0].processingToken), false);
  } finally {
    await cleanup([user._id]);
  }
});
