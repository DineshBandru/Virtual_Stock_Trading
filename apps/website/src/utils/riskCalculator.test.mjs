import test from "node:test";
import assert from "node:assert/strict";
import { calculatePositionSize } from "./riskCalculator.js";

test("normal risk calculation", () => {
  const result = calculatePositionSize({
    availableBalance: 100000,
    entryPrice: 500,
    stopLossPrice: 480,
    riskPercent: 1
  });
  assert.equal(result.valid, true);
  assert.equal(result.riskBudget, 1000);
  assert.equal(result.riskPerShare, 20);
  assert.equal(result.riskBasedQuantity, 50);
  assert.equal(result.suggestedQuantity, 50);
});

test("stop at or above entry is invalid", () => {
  const result = calculatePositionSize({
    availableBalance: 100000,
    entryPrice: 500,
    stopLossPrice: 500,
    riskPercent: 1
  });
  assert.equal(result.valid, false);
});

test("zero or negative inputs are invalid", () => {
  assert.equal(calculatePositionSize({ availableBalance: 0, entryPrice: 1, stopLossPrice: 0.5, riskPercent: 1 }).valid, false);
  assert.equal(calculatePositionSize({ availableBalance: 100, entryPrice: -1, stopLossPrice: 0.5, riskPercent: 1 }).valid, false);
  assert.equal(calculatePositionSize({ availableBalance: 100, entryPrice: 1, stopLossPrice: 0.5, riskPercent: 0 }).valid, false);
});

test("affordability caps risk quantity", () => {
  const result = calculatePositionSize({
    availableBalance: 1000,
    entryPrice: 400,
    stopLossPrice: 399,
    riskPercent: 10
  });
  assert.equal(result.riskBasedQuantity, 100);
  assert.equal(result.affordableQuantity, 2);
  assert.equal(result.suggestedQuantity, 2);
  assert.equal(result.approximateMaximumLoss, 2);
});
