const crypto = require("crypto");

const STARTING_VIRTUAL_CAPITAL = 1000000;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTransactionId = (transaction) =>
  String(transaction?._id || transaction?.id || transaction?.orderId || `${transaction?.timestamp}-${transaction?.type}`);

const buildEpisodeId = ({ userId, symbol, firstTransactionId, closingTransactionId }) =>
  crypto
    .createHash("sha256")
    .update([String(userId), String(symbol), String(firstTransactionId), String(closingTransactionId)].join(":"))
    .digest("hex")
    .slice(0, 32);

const calculateHoldingPeriod = (openedAt, closedAt) => {
  const opened = new Date(openedAt).getTime();
  const closed = new Date(closedAt).getTime();
  if (!Number.isFinite(opened) || !Number.isFinite(closed) || closed < opened) {
    return { milliseconds: 0, days: 0, label: "Same day" };
  }
  const milliseconds = closed - opened;
  const days = Math.max(0, milliseconds / (24 * 60 * 60 * 1000));
  return {
    milliseconds,
    days,
    label: days < 1 ? "Same day" : `${days.toFixed(days >= 10 ? 0 : 1)} days`
  };
};

const normalizeTransaction = (transaction) => ({
  id: getTransactionId(transaction),
  _id: transaction._id,
  orderId: transaction.orderId,
  userId: transaction.userId,
  type: transaction.type,
  symbol: String(transaction.symbol || "").toUpperCase(),
  companyName: transaction.companyName || "",
  quantity: toNumber(transaction.quantity),
  price: toNumber(transaction.price),
  total: toNumber(transaction.total),
  realizedPnL: Number.isFinite(Number(transaction.realizedPnL)) ? Number(transaction.realizedPnL) : null,
  timestamp: transaction.timestamp || transaction.createdAt || new Date(0)
});

const reconstructClosedTrades = (transactions = [], userId = "") => {
  const sorted = transactions
    .map(normalizeTransaction)
    .filter((transaction) =>
      transaction.symbol &&
      ["BUY", "SELL"].includes(transaction.type) &&
      transaction.quantity > 0 &&
      transaction.price > 0
    )
    .sort((left, right) => {
      const timeDiff = new Date(left.timestamp) - new Date(right.timestamp);
      return timeDiff || left.id.localeCompare(right.id);
    });

  const states = new Map();
  const closedTrades = [];

  sorted.forEach((transaction) => {
    const state = states.get(transaction.symbol) || {
      quantity: 0,
      costBasis: 0,
      episode: null
    };

    if (transaction.type === "BUY") {
      if (state.quantity === 0) {
        state.episode = {
          userId,
          symbol: transaction.symbol,
          companyName: transaction.companyName,
          openedAt: transaction.timestamp,
          firstTransactionId: transaction.id,
          totalBuyQuantity: 0,
          totalBuyValue: 0,
          totalSellQuantity: 0,
          totalSellValue: 0,
          realizedPnL: 0,
          executions: []
        };
        state.costBasis = 0;
      }

      state.quantity += transaction.quantity;
      state.costBasis += transaction.total || transaction.quantity * transaction.price;
      state.episode.totalBuyQuantity += transaction.quantity;
      state.episode.totalBuyValue += transaction.total || transaction.quantity * transaction.price;
      state.episode.companyName = state.episode.companyName || transaction.companyName;
      state.episode.executions.push(transaction);
    }

    if (transaction.type === "SELL" && state.quantity > 0 && state.episode) {
      const sellQuantity = Math.min(transaction.quantity, state.quantity);
      const averageCostBeforeSell = state.quantity > 0 ? state.costBasis / state.quantity : 0;
      const costRemoved = averageCostBeforeSell * sellQuantity;
      const sellValue = transaction.total || sellQuantity * transaction.price;
      const estimatedPnL = sellValue - costRemoved;

      state.quantity -= sellQuantity;
      state.costBasis = Math.max(0, state.costBasis - costRemoved);
      state.episode.totalSellQuantity += sellQuantity;
      state.episode.totalSellValue += sellValue;
      state.episode.realizedPnL += transaction.realizedPnL === null ? estimatedPnL : transaction.realizedPnL;
      state.episode.executions.push(transaction);

      if (state.quantity <= 0.0000001) {
        const closingTransactionId = transaction.id;
        const closedAt = transaction.timestamp;
        const holdingPeriod = calculateHoldingPeriod(state.episode.openedAt, closedAt);
        const weightedAverageEntryPrice =
          state.episode.totalBuyQuantity > 0 ? state.episode.totalBuyValue / state.episode.totalBuyQuantity : 0;
        const weightedAverageExitPrice =
          state.episode.totalSellQuantity > 0 ? state.episode.totalSellValue / state.episode.totalSellQuantity : 0;
        const returnPercentage =
          state.episode.totalBuyValue > 0 ? (state.episode.realizedPnL / state.episode.totalBuyValue) * 100 : 0;

        closedTrades.push({
          episodeId: buildEpisodeId({
            userId,
            symbol: state.episode.symbol,
            firstTransactionId: state.episode.firstTransactionId,
            closingTransactionId
          }),
          symbol: state.episode.symbol,
          companyName: state.episode.companyName,
          openedAt: state.episode.openedAt,
          closedAt,
          holdingPeriod,
          totalBuyQuantity: state.episode.totalBuyQuantity,
          totalSellQuantity: state.episode.totalSellQuantity,
          quantity: state.episode.totalSellQuantity,
          weightedAverageEntryPrice,
          weightedAverageExitPrice,
          realizedPnL: state.episode.realizedPnL,
          returnPercentage,
          executions: state.episode.executions.map((item) => ({
            id: item.id,
            orderId: item.orderId,
            type: item.type,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
            realizedPnL: item.realizedPnL,
            timestamp: item.timestamp
          }))
        });

        state.quantity = 0;
        state.costBasis = 0;
        state.episode = null;
      }
    }

    states.set(transaction.symbol, state);
  });

  return closedTrades.sort((left, right) => new Date(left.closedAt) - new Date(right.closedAt));
};

const buildRealizedEquitySeries = (closedTrades = [], startingCapital = STARTING_VIRTUAL_CAPITAL) => {
  let cumulativeRealizedPnL = 0;
  let peak = startingCapital;

  return closedTrades.map((trade) => {
    cumulativeRealizedPnL += toNumber(trade.realizedPnL);
    const equity = startingCapital + cumulativeRealizedPnL;
    peak = Math.max(peak, equity);
    const drawdownPercentage = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
    return {
      episodeId: trade.episodeId,
      date: trade.closedAt,
      symbol: trade.symbol,
      realizedPnL: trade.realizedPnL,
      cumulativeRealizedPnL,
      equity,
      drawdownPercentage
    };
  });
};

const summarizePerformance = (closedTrades = [], equitySeries = []) => {
  const winningTrades = closedTrades.filter((trade) => trade.realizedPnL > 0);
  const losingTrades = closedTrades.filter((trade) => trade.realizedPnL < 0);
  const breakEvenTrades = closedTrades.filter((trade) => trade.realizedPnL === 0);
  const totalRealizedPnL = closedTrades.reduce((sum, trade) => sum + toNumber(trade.realizedPnL), 0);
  const average = (items, selector) =>
    items.length ? items.reduce((sum, item) => sum + selector(item), 0) / items.length : null;

  return {
    totalClosedTrades: closedTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate: closedTrades.length ? (winningTrades.length / closedTrades.length) * 100 : null,
    totalRealizedPnL,
    averageWinningTrade: average(winningTrades, (trade) => trade.realizedPnL),
    averageLosingTrade: average(losingTrades, (trade) => trade.realizedPnL),
    bestTrade: [...closedTrades].sort((left, right) => right.realizedPnL - left.realizedPnL)[0] || null,
    worstTrade: [...closedTrades].sort((left, right) => left.realizedPnL - right.realizedPnL)[0] || null,
    averageReturnPercentage: average(closedTrades, (trade) => trade.returnPercentage),
    averageHoldingPeriodDays: average(closedTrades, (trade) => trade.holdingPeriod.days),
    maximumDrawdownPercentage: equitySeries.length
      ? Math.min(...equitySeries.map((point) => point.drawdownPercentage))
      : null
  };
};

const buildPerformanceAnalytics = (transactions = [], userId = "", reviewedEpisodeIds = []) => {
  const closedTrades = reconstructClosedTrades(transactions, userId);
  const equitySeries = buildRealizedEquitySeries(closedTrades);
  const metrics = summarizePerformance(closedTrades, equitySeries);
  const reviewedSet = new Set(reviewedEpisodeIds.map(String));
  return {
    metrics: {
      ...metrics,
      reviewedTrades: closedTrades.filter((trade) => reviewedSet.has(trade.episodeId)).length
    },
    equitySeries,
    closedTrades
  };
};

module.exports = {
  STARTING_VIRTUAL_CAPITAL,
  buildEpisodeId,
  buildPerformanceAnalytics,
  buildRealizedEquitySeries,
  reconstructClosedTrades,
  summarizePerformance
};
