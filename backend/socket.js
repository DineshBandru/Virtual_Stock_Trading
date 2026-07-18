const Watchlist = require("./models/Watchlist");
const Alert = require("./models/Alert");
const { getQuote } = require("./utils/market");
const { buildLeaderboard } = require("./utils/leaderboard");

let ioRef = null;
let priceInterval = null;
let leaderboardInterval = null;

const collectSymbols = async () => {
  const lists = await Watchlist.find().lean();
  const symbols = new Set();
  lists.forEach((list) => {
    if (Array.isArray(list.symbols)) {
      list.symbols.forEach((symbol) => symbols.add(symbol));
    }
    if (Array.isArray(list.lists)) {
      list.lists.forEach((watchlistItem) => {
        if (Array.isArray(watchlistItem.symbols)) {
          watchlistItem.symbols.forEach((symbol) => symbols.add(symbol));
        }
      });
    }
  });
  return Array.from(symbols);
};

const pollPrices = async () => {
  const symbols = await collectSymbols();
  if (symbols.length === 0) return;

  const quotes = await Promise.all(symbols.map((symbol) => getQuote(symbol)));
  const payload = symbols.reduce((acc, symbol, index) => {
    acc[symbol] = quotes[index];
    return acc;
  }, {});

  if (ioRef) {
    ioRef.emit("prices:update", payload);
  }

  const alerts = await Alert.find({ triggered: false }).lean();
  const triggered = [];
  for (const alert of alerts) {
    const quote = payload[alert.symbol];
    if (!quote || !quote.c) continue;
    if (alert.condition === "above" && quote.c >= alert.targetPrice) {
      triggered.push(alert);
    }
    if (alert.condition === "below" && quote.c <= alert.targetPrice) {
      triggered.push(alert);
    }
  }

  if (triggered.length > 0) {
    await Alert.updateMany(
      { _id: { $in: triggered.map((item) => item._id) } },
      { $set: { triggered: true } }
    );
    triggered.forEach((alert) => {
      ioRef.emit("alerts:triggered", {
        userId: alert.userId,
        symbol: alert.symbol,
        targetPrice: alert.targetPrice,
        condition: alert.condition
      });
    });
  }
};

const pollLeaderboard = async () => {
  const payload = await buildLeaderboard();
  if (ioRef) {
    ioRef.emit("leaderboard:update", payload);
  }
};

const attachSocket = (io) => {
  ioRef = io;
  io.on("connection", (socket) => {
    socket.on("disconnect", () => {});
  });

  if (!priceInterval) {
    priceInterval = setInterval(() => {
      pollPrices().catch(() => {});
    }, 15000);
  }

  if (!leaderboardInterval) {
    leaderboardInterval = setInterval(() => {
      pollLeaderboard().catch(() => {});
    }, 60000);
  }
};

const emitEvent = (event, payload) => {
  if (ioRef) {
    ioRef.emit(event, payload);
  }
};

module.exports = { attachSocket, emitEvent };
