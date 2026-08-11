import test from "node:test";
import assert from "node:assert/strict";
import { calculateEMA, calculateMACD, calculateRSI, calculateSMA } from "./technicalIndicators.js";

const candles = Array.from({ length: 40 }, (_, index) => ({
  time: index + 1,
  close: index + 1
}));

test("SMA returns null until enough history exists and stays aligned", () => {
  const sma = calculateSMA(candles.slice(0, 5), 3);
  assert.equal(sma.length, 5);
  assert.equal(sma[0].value, null);
  assert.equal(sma[1].value, null);
  assert.equal(sma[2].value, 2);
  assert.equal(sma[4].time, 5);
});

test("EMA seeds from SMA and does not produce NaN", () => {
  const ema = calculateEMA(candles.slice(0, 5), 3);
  assert.equal(ema[0].value, null);
  assert.equal(ema[2].value, 2);
  assert.equal(ema[3].value, 3);
  assert.ok(ema.every((point) => point.value === null || Number.isFinite(point.value)));
});

test("RSI returns bounded values after sufficient history", () => {
  const rsi = calculateRSI(candles, 14);
  assert.equal(rsi[13].value, null);
  assert.equal(rsi[14].value, 100);
  assert.ok(rsi.every((point) => point.value === null || (point.value >= 0 && point.value <= 100)));
});

test("MACD aligns timestamps and avoids NaN/Infinity", () => {
  const macd = calculateMACD(candles, 12, 26, 9);
  assert.equal(macd.macdLine.length, candles.length);
  assert.equal(macd.signalLine.length, candles.length);
  assert.equal(macd.histogram.length, candles.length);
  assert.ok(macd.macdLine.every((point) => point.value === null || Number.isFinite(point.value)));
  assert.ok(macd.signalLine.every((point) => point.value === null || Number.isFinite(point.value)));
  assert.ok(macd.histogram.every((point) => point.value === null || Number.isFinite(point.value)));
});
