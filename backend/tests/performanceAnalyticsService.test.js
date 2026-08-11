const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPerformanceAnalytics,
  buildRealizedEquitySeries,
  reconstructClosedTrades
} = require("../services/performanceAnalyticsService");

const tx = (id, type, symbol, quantity, price, day, realizedPnL = 0) => ({
  _id: id,
  userId: "user-a",
  type,
  symbol,
  companyName: symbol,
  quantity,
  price,
  total: quantity * price,
  realizedPnL,
  timestamp: new Date(`2026-01-${String(day).padStart(2, "0")}T10:00:00.000Z`)
});

test("simple round trip creates one closed trade", () => {
  const trades = reconstructClosedTrades([
    tx("b1", "BUY", "ABC.NS", 5, 100, 1),
    tx("s1", "SELL", "ABC.NS", 5, 110, 2, 50)
  ], "user-a");
  assert.equal(trades.length, 1);
  assert.equal(trades[0].totalBuyQuantity, 5);
  assert.equal(trades[0].totalSellQuantity, 5);
  assert.equal(trades[0].realizedPnL, 50);
  assert.equal(trades[0].returnPercentage, 10);
});

test("multiple buys and one sell remain one episode", () => {
  const trades = reconstructClosedTrades([
    tx("b1", "BUY", "ABC.NS", 5, 100, 1),
    tx("b2", "BUY", "ABC.NS", 5, 120, 2),
    tx("s1", "SELL", "ABC.NS", 10, 130, 3, 200)
  ], "user-a");
  assert.equal(trades.length, 1);
  assert.equal(trades[0].weightedAverageEntryPrice, 110);
  assert.equal(trades[0].weightedAverageExitPrice, 130);
});

test("partial sells close only when quantity returns to zero", () => {
  const trades = reconstructClosedTrades([
    tx("b1", "BUY", "ABC.NS", 10, 100, 1),
    tx("s1", "SELL", "ABC.NS", 4, 105, 2, 20),
    tx("s2", "SELL", "ABC.NS", 6, 110, 3, 60)
  ], "user-a");
  assert.equal(trades.length, 1);
  assert.equal(trades[0].executions.length, 3);
  assert.equal(trades[0].realizedPnL, 80);
});

test("re-entry creates two closed trades", () => {
  const trades = reconstructClosedTrades([
    tx("b1", "BUY", "ABC.NS", 1, 100, 1),
    tx("s1", "SELL", "ABC.NS", 1, 110, 2, 10),
    tx("b2", "BUY", "ABC.NS", 1, 120, 3),
    tx("s2", "SELL", "ABC.NS", 1, 115, 4, -5)
  ], "user-a");
  assert.equal(trades.length, 2);
  assert.notEqual(trades[0].episodeId, trades[1].episodeId);
});

test("open position is excluded", () => {
  const trades = reconstructClosedTrades([tx("b1", "BUY", "ABC.NS", 1, 100, 1)], "user-a");
  assert.equal(trades.length, 0);
});

test("win, loss, break-even, win rate and drawdown are deterministic", () => {
  const analytics = buildPerformanceAnalytics([
    tx("b1", "BUY", "AAA.NS", 1, 100, 1),
    tx("s1", "SELL", "AAA.NS", 1, 120, 2, 20),
    tx("b2", "BUY", "BBB.NS", 1, 100, 3),
    tx("s2", "SELL", "BBB.NS", 1, 90, 4, -10),
    tx("b3", "BUY", "CCC.NS", 1, 100, 5),
    tx("s3", "SELL", "CCC.NS", 1, 100, 6, 0)
  ], "user-a");

  assert.equal(analytics.metrics.totalClosedTrades, 3);
  assert.equal(analytics.metrics.winningTrades, 1);
  assert.equal(analytics.metrics.losingTrades, 1);
  assert.equal(analytics.metrics.breakEvenTrades, 1);
  assert.equal(Number(analytics.metrics.winRate.toFixed(2)), 33.33);
  assert.equal(analytics.metrics.totalRealizedPnL, 10);
  assert.ok(analytics.metrics.maximumDrawdownPercentage < 0);
});

test("realized equity curve uses starting capital plus cumulative realized P&L", () => {
  const series = buildRealizedEquitySeries([
    { episodeId: "1", symbol: "A", closedAt: new Date("2026-01-01"), realizedPnL: 100 },
    { episodeId: "2", symbol: "B", closedAt: new Date("2026-01-02"), realizedPnL: -50 }
  ], 1000);
  assert.equal(series[0].equity, 1100);
  assert.equal(series[1].equity, 1050);
  assert.equal(Number(series[1].drawdownPercentage.toFixed(2)), -4.55);
});
