const jwt = require("jsonwebtoken");
const User = require("./models/User");
const Alert = require("./models/Alert");
const { ensureNseSymbol } = require("./utils/market");
const { buildLeaderboard } = require("./utils/leaderboard");
const { fetchLiveQuotes } = require("./services/liveMarketService");

let ioRef = null;
let priceTimer = null;
let leaderboardInterval = null;

const socketSubscriptions = new Map();
const symbolSubscriptions = new Map();

const userRoom = (userId) => `user:${userId}`;
const symbolRoom = (symbol) => `symbol:${ensureNseSymbol(symbol)}`;

const isTriggerableQuote = (quote) =>
  quote &&
  Number.isFinite(Number(quote.price)) &&
  Number(quote.price) > 0 &&
  !quote.stale &&
  !quote.unavailable &&
  quote.status !== "unavailable";

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join("=") || "");
    return cookies;
  }, {});

const authenticateSocket = async (socket, next) => {
  try {
    const cookies = parseCookies(socket.handshake.headers.cookie || "");
    const token = cookies.token;
    if (!token) return next(new Error("Unauthorized"));

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("role tokenVersion").lean();
    if (!user) return next(new Error("Unauthorized"));
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.tokenVersion) {
      return next(new Error("Unauthorized"));
    }

    socket.data.userId = payload.id;
    socket.data.role = user.role;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
};

const getSubscribedSymbols = () => Array.from(symbolSubscriptions.keys());

const removeSocketSubscriptions = (socket) => {
  const symbols = socketSubscriptions.get(socket.id) || new Set();
  symbols.forEach((symbol) => {
    socket.leave(symbolRoom(symbol));
    const sockets = symbolSubscriptions.get(symbol);
    if (!sockets) return;
    sockets.delete(socket.id);
    if (sockets.size === 0) {
      symbolSubscriptions.delete(symbol);
    }
  });
  socketSubscriptions.delete(socket.id);
};

const addSocketSubscriptions = (socket, symbols = []) => {
  const current = socketSubscriptions.get(socket.id) || new Set();
  const accepted = [];

  symbols
    .map((symbol) => ensureNseSymbol(String(symbol || "").trim()))
    .filter(Boolean)
    .forEach((symbol) => {
      if (current.has(symbol)) return;
      current.add(symbol);
      socket.join(symbolRoom(symbol));
      if (!symbolSubscriptions.has(symbol)) {
        symbolSubscriptions.set(symbol, new Set());
      }
      symbolSubscriptions.get(symbol).add(socket.id);
      accepted.push(symbol);
    });

  socketSubscriptions.set(socket.id, current);
  return accepted;
};

const removeSelectedSubscriptions = (socket, symbols = []) => {
  const current = socketSubscriptions.get(socket.id);
  if (!current) return;

  symbols
    .map((symbol) => ensureNseSymbol(String(symbol || "").trim()))
    .filter(Boolean)
    .forEach((symbol) => {
      current.delete(symbol);
      socket.leave(symbolRoom(symbol));
      const sockets = symbolSubscriptions.get(symbol);
      if (!sockets) return;
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        symbolSubscriptions.delete(symbol);
      }
    });

  if (current.size === 0) {
    socketSubscriptions.delete(socket.id);
  }
};

const triggerAlertsForQuotes = async (quotes = []) => {
  if (!ioRef) return;
  const quoteMap = new Map(
    quotes
      .filter(isTriggerableQuote)
      .map((quote) => [ensureNseSymbol(quote.symbol), quote])
  );
  const symbols = Array.from(quoteMap.keys());
  if (symbols.length === 0) return;

  const alerts = await Alert.find({ triggered: false, symbol: { $in: symbols } }).lean();
  for (const alert of alerts) {
    try {
      const quote = quoteMap.get(ensureNseSymbol(alert.symbol));
      if (!quote) continue;
      const price = Number(quote.price);
      const shouldTrigger = alert.condition === "above"
        ? price >= alert.targetPrice
        : price <= alert.targetPrice;
      if (!shouldTrigger) continue;

      const triggeredAt = new Date();
      const result = await Alert.updateOne(
        { _id: alert._id, userId: alert.userId, triggered: false },
        {
          $set: {
            triggered: true,
            triggeredAt,
            triggeredPrice: price
          }
        }
      );

      if (result.modifiedCount !== 1) continue;

      const payload = {
        alertId: alert._id.toString(),
        userId: alert.userId.toString(),
        symbol: alert.symbol,
        condition: alert.condition,
        targetPrice: alert.targetPrice,
        triggeredPrice: price,
        triggeredAt: triggeredAt.toISOString()
      };
      ioRef.to(userRoom(alert.userId)).emit("alert-triggered", payload);
      ioRef.to(userRoom(alert.userId)).emit("alerts:triggered", payload);
      ioRef.to(userRoom(alert.userId)).emit("alerts:update", payload);
    } catch (error) {
      // Continue evaluating other alerts even if one update or emit fails.
    }
  }
};

const emitQuotes = async (quotes, marketSession, targetSocket = null) => {
  const quoteMap = quotes.reduce((acc, quote) => {
    acc[quote.symbol] = quote;
    return acc;
  }, {});

  quotes.forEach((quote) => {
    const target = targetSocket || ioRef.to(symbolRoom(quote.symbol));
    target.emit("quote-update", {
      ...quote,
      marketSession
    });
    target.emit("prices:update", {
      [quote.symbol]: quoteMap[quote.symbol]
    });
  });

  await triggerAlertsForQuotes(quotes);
};

const schedulePricePoll = async () => {
  if (!ioRef) return;
  let nextPollMs = 15000;

  try {
    const symbols = getSubscribedSymbols();
    if (symbols.length > 0) {
      const result = await fetchLiveQuotes(symbols);
      nextPollMs = result.nextPollMs;
      await emitQuotes(result.quotes, result.marketSession);
    }
  } catch (error) {
    nextPollMs = 60000;
  } finally {
    priceTimer = setTimeout(() => {
      schedulePricePoll().catch(() => {});
    }, nextPollMs);
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
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    socket.join(userRoom(socket.data.userId));

    socket.on("subscribe-symbols", async (symbols = [], ack) => {
      if (!socket.data.userId) {
        if (typeof ack === "function") ack({ ok: false, message: "Unauthorized" });
        return;
      }

      const accepted = addSocketSubscriptions(socket, Array.isArray(symbols) ? symbols : []);
      if (typeof ack === "function") ack({ ok: true, symbols: accepted });

      if (accepted.length > 0) {
        try {
          const { quotes, marketSession } = await fetchLiveQuotes(accepted);
          await emitQuotes(quotes, marketSession, socket);
        } catch (error) {
          socket.emit("market-data:error", { message: "Market prices are temporarily unavailable" });
        }
      }
    });

    socket.on("unsubscribe-symbols", (symbols = [], ack) => {
      removeSelectedSubscriptions(socket, Array.isArray(symbols) ? symbols : []);
      if (typeof ack === "function") ack({ ok: true });
    });

    socket.on("disconnect", () => {
      removeSocketSubscriptions(socket);
    });
  });

  if (!priceTimer) {
    schedulePricePoll().catch(() => {});
  }

  if (!leaderboardInterval) {
    leaderboardInterval = setInterval(() => {
      pollLeaderboard().catch(() => {});
    }, 60000);
  }
};

const emitEvent = (event, payload = {}) => {
  if (!ioRef) return;
  if (payload.userId) {
    ioRef.to(userRoom(payload.userId)).emit(event, payload);
    return;
  }
  ioRef.emit(event, payload);
};

module.exports = { attachSocket, emitEvent };
