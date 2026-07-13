const Order = require("../models/Order");

const normalizeSymbol = (symbol) => String(symbol || "").trim().toUpperCase();

const getDisplayPrice = (order) => {
  if (order.orderType === "LIMIT") {
    return Number(order.limitPrice);
  }

  if (order.orderType === "STOP_LIMIT") {
    return order.stopTriggeredAt ? Number(order.limitPrice) : Number(order.triggerPrice);
  }

  if (order.orderType === "STOP_LOSS") {
    return Number(order.triggerPrice);
  }

  return null;
};

const roundPrice = (value) => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(2));
};

const aggregateLevels = (orders, side) => {
  const levels = new Map();

  orders.forEach((order) => {
    if (order.side !== side || order.status !== "Pending") {
      return;
    }

    if (order.orderType === "MARKET") {
      return;
    }

    const price = roundPrice(getDisplayPrice(order));
    if (!Number.isFinite(price) || price <= 0) {
      return;
    }

    const existing = levels.get(price) || {
      price,
      quantity: 0,
      orders: 0
    };

    existing.quantity += Number(order.quantity) || 0;
    existing.orders += 1;
    levels.set(price, existing);
  });

  const sorted = Array.from(levels.values()).sort((left, right) => {
    return side === "BUY" ? right.price - left.price : left.price - right.price;
  });

  return sorted.slice(0, 5);
};

const getMarketDepth = async (symbol) => {
  const normalizedSymbol = normalizeSymbol(symbol);
  if (!normalizedSymbol) {
    return {
      bids: [],
      asks: [],
      totalBuyQty: 0,
      totalSellQty: 0,
      buySellRatio: 0,
      spread: 0
    };
  }

  const orders = await Order.find({
    symbol: normalizedSymbol,
    status: "Pending"
  }).lean();

  const bids = aggregateLevels(orders, "BUY");
  const asks = aggregateLevels(orders, "SELL");

  const totalBuyQty = orders
    .filter((order) => order.side === "BUY" && order.status === "Pending" && order.orderType !== "MARKET")
    .reduce((sum, order) => sum + (Number(order.quantity) || 0), 0);

  const totalSellQty = orders
    .filter((order) => order.side === "SELL" && order.status === "Pending" && order.orderType !== "MARKET")
    .reduce((sum, order) => sum + (Number(order.quantity) || 0), 0);

  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread = bestBid > 0 && bestAsk > 0 ? roundPrice(Math.max(0, bestAsk - bestBid)) : 0;
  const buySellRatio = totalSellQty > 0 ? Number((totalBuyQty / totalSellQty).toFixed(2)) : totalBuyQty > 0 ? Number(totalBuyQty.toFixed(2)) : 0;

  return {
    bids,
    asks,
    totalBuyQty,
    totalSellQty,
    buySellRatio,
    spread
  };
};

module.exports = { getMarketDepth };