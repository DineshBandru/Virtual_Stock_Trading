const Portfolio = require("../models/Portfolio");
const Transaction = require("../models/Transaction");
const { getQuote } = require("../utils/market");

const normalizeSymbol = (symbol) => String(symbol || "").trim().toUpperCase();

const round = (value) => Number((Number(value) || 0).toFixed(2));

const createEmptySummary = () => ({
  buyQty: 0,
  sellQty: 0,
  buyValue: 0,
  sellValue: 0,
  investedCost: 0,
  realizedPnL: 0,
  quantity: 0
});

const buildTransactionSummaryMap = (transactions) => {
  const summaries = new Map();

  [...transactions]
    .sort((left, right) => new Date(left.timestamp || left.createdAt) - new Date(right.timestamp || right.createdAt))
    .forEach((transaction) => {
      const symbol = normalizeSymbol(transaction.symbol);
      if (!symbol) {
        return;
      }

      const summary = summaries.get(symbol) || createEmptySummary();
      const quantity = Number(transaction.quantity) || 0;
      const price = Number(transaction.price) || 0;
      const total = Number(transaction.total) || quantity * price;

      if (transaction.type === "BUY") {
        summary.buyQty += quantity;
        summary.buyValue += total;
        summary.investedCost += total;
        summary.quantity += quantity;
      } else if (transaction.type === "SELL") {
        const sellQty = Math.min(quantity, summary.quantity);
        const averageCost = summary.quantity > 0 ? summary.investedCost / summary.quantity : 0;
        summary.sellQty += quantity;
        summary.sellValue += total;
        summary.realizedPnL += (price - averageCost) * sellQty;
        summary.investedCost = Math.max(0, summary.investedCost - averageCost * sellQty);
        summary.quantity = Math.max(0, summary.quantity - sellQty);
      }

      summaries.set(symbol, summary);
    });

  return summaries;
};

const shapePosition = ({ symbol, companyName, txSummary, holding, quote }) => {
  const currentPrice = Number(quote?.c) || 0;
  const buyQty = txSummary?.buyQty || 0;
  const sellQty = txSummary?.sellQty || 0;
  const txNetQty = txSummary?.quantity || 0;
  const isOpen = holding ? holding.quantity > 0 : txNetQty > 0;
  const netQuantity = holding ? holding.quantity : txNetQty;
  const investedValue = holding ? Number(holding.totalInvested) || 0 : round(txSummary?.buyValue || 0);
  const averageBuyPrice = holding
    ? Number(holding.avgBuyPrice) || 0
    : buyQty > 0
      ? round((txSummary?.buyValue || 0) / buyQty)
      : 0;
  const averageSellPrice = sellQty > 0 ? round((txSummary?.sellValue || 0) / sellQty) : 0;
  const currentValue = isOpen ? round(currentPrice * netQuantity) : 0;
  const unrealizedPnL = isOpen ? round(currentValue - investedValue) : 0;
  const realizedPnL = round(txSummary?.realizedPnL || 0);
  const totalPnL = round(realizedPnL + unrealizedPnL);
  const pnlBase = buyQty > 0 ? round(txSummary?.buyValue || investedValue || 0) : investedValue || 0;
  const pnlPct = pnlBase > 0 ? round((totalPnL / pnlBase) * 100) : 0;
  const positionType = isOpen
    ? sellQty > 0
      ? "PARTIALLY_CLOSED"
      : "LONG"
    : buyQty > 0 || sellQty > 0
      ? "CLOSED"
      : "LONG";

  return {
    symbol,
    companyName,
    netQty: netQuantity,
    buyQty,
    sellQty,
    averageBuyPrice,
    averageSellPrice,
    currentPrice,
    investedValue: round(investedValue),
    currentValue,
    unrealizedPnL,
    realizedPnL,
    totalPnL,
    pnlPct,
    positionType
  };
};

const buildPositions = async (userId) => {
  const [holdings, transactions] = await Promise.all([
    Portfolio.find({ userId }).lean(),
    Transaction.find({ userId }).sort({ timestamp: 1, createdAt: 1 }).lean()
  ]);

  const holdingMap = new Map(
    holdings.map((holding) => [normalizeSymbol(holding.symbol), holding])
  );
  const transactionSummaryMap = buildTransactionSummaryMap(transactions);
  const symbolSet = new Set([
    ...holdingMap.keys(),
    ...transactionSummaryMap.keys()
  ]);

  const quoteSymbols = Array.from(symbolSet);
  const quotes = await Promise.all(quoteSymbols.map((symbol) => getQuote(symbol).catch(() => null)));
  const quoteMap = new Map(quoteSymbols.map((symbol, index) => [symbol, quotes[index]]));

  const positions = Array.from(symbolSet).map((symbol) => {
    const holding = holdingMap.get(symbol) || null;
    const txSummary = transactionSummaryMap.get(symbol) || createEmptySummary();
    const quote = quoteMap.get(symbol) || null;
    const companyName = holding?.companyName || transactions.find((item) => normalizeSymbol(item.symbol) === symbol)?.companyName || symbol;
    return shapePosition({ symbol, companyName, txSummary, holding, quote });
  });

  const openPositions = positions
    .filter((position) => position.netQty > 0)
    .sort((left, right) => right.totalPnL - left.totalPnL || left.symbol.localeCompare(right.symbol));

  const closedPositions = positions
    .filter((position) => position.netQty === 0 && (position.buyQty > 0 || position.sellQty > 0))
    .sort((left, right) => right.totalPnL - left.totalPnL || left.symbol.localeCompare(right.symbol));

  const totalOpenPnL = round(openPositions.reduce((sum, position) => sum + position.unrealizedPnL, 0));
  const totalRealizedPnL = round(positions.reduce((sum, position) => sum + position.realizedPnL, 0));
  const totalPositions = positions.length;
  const winningPositions = positions.filter((position) => position.totalPnL > 0).length;
  const losingPositions = positions.filter((position) => position.totalPnL < 0).length;
  const winRate = totalPositions > 0 ? round((winningPositions / totalPositions) * 100) : 0;
  const largestWinner = positions.reduce((best, position) => {
    if (!best || position.totalPnL > best.totalPnL) {
      return position;
    }
    return best;
  }, null);
  const largestLoser = positions.reduce((worst, position) => {
    if (!worst || position.totalPnL < worst.totalPnL) {
      return position;
    }
    return worst;
  }, null);

  return {
    openPositions,
    closedPositions,
    summary: {
      totalOpenPnL,
      totalRealizedPnL,
      totalPositions,
      winningPositions,
      losingPositions,
      winRate,
      totalInvested: round(openPositions.reduce((sum, position) => sum + position.investedValue, 0)),
      totalCurrentValue: round(openPositions.reduce((sum, position) => sum + position.currentValue, 0)),
      largestWinner: largestWinner ? {
        symbol: largestWinner.symbol,
        companyName: largestWinner.companyName,
        totalPnL: largestWinner.totalPnL,
        pnlPct: largestWinner.pnlPct
      } : null,
      largestLoser: largestLoser ? {
        symbol: largestLoser.symbol,
        companyName: largestLoser.companyName,
        totalPnL: largestLoser.totalPnL,
        pnlPct: largestLoser.pnlPct
      } : null
    }
  };
};

module.exports = { buildPositions };