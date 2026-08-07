const NSE_TIME_ZONE = "Asia/Kolkata";
const MARKET_OPEN_MINUTES = 9 * 60 + 15;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;
const QUOTE_FRESH_MS = Number(process.env.QUOTE_FRESH_MS || 60 * 1000);

const getExchangeParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: NSE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false
  });

  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: parts.weekday,
    minutes: hour * 60 + minute,
    isoLike: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}+05:30`
  };
};

const getConfiguredHolidays = () => {
  const raw = process.env.NSE_HOLIDAYS || "";
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
};

const getMarketSession = (date = new Date()) => {
  const exchange = getExchangeParts(date);
  const holidays = getConfiguredHolidays();
  const weekend = exchange.weekday === "Sat" || exchange.weekday === "Sun";
  const holiday = holidays.has(exchange.dateKey);
  const open =
    !weekend &&
    !holiday &&
    exchange.minutes >= MARKET_OPEN_MINUTES &&
    exchange.minutes <= MARKET_CLOSE_MINUTES;

  let reason = "Market open";
  let state = "open";
  if (weekend) {
    reason = "NSE market is closed for the weekend";
    state = "weekend";
  } else if (holiday) {
    reason = "NSE market is closed for an exchange holiday";
    state = "holiday";
  } else if (exchange.minutes < MARKET_OPEN_MINUTES) {
    reason = "NSE market has not opened yet";
    state = "closed";
  } else if (exchange.minutes > MARKET_CLOSE_MINUTES) {
    reason = "NSE market is closed for the day";
    state = "closed";
  }

  return {
    open,
    state,
    reason,
    exchangeTime: exchange.isoLike,
    dateKey: exchange.dateKey,
    timeZone: NSE_TIME_ZONE
  };
};

const normalizeSymbol = (symbol) => String(symbol || "").trim().toUpperCase();

const isHaltedState = (state) => {
  const normalized = String(state || "").trim().toUpperCase();
  return ["HALTED", "SUSPENDED", "UNAVAILABLE"].includes(normalized);
};

const isExecutableQuote = (quote, now = new Date(), expectedSymbol = "") => {
  const price = Number(quote?.c);
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "Market price unavailable" };
  }
  if (quote?.unavailable || quote?.error) {
    return { ok: false, reason: "Market price unavailable" };
  }
  if (quote?.stale) {
    return { ok: false, reason: "Market price is stale" };
  }
  if (expectedSymbol && quote?.symbol && normalizeSymbol(quote.symbol) !== normalizeSymbol(expectedSymbol)) {
    return { ok: false, reason: "Market price symbol mismatch" };
  }
  if (isHaltedState(quote?.tradingStatus) || isHaltedState(quote?.marketState)) {
    return { ok: false, reason: "Trading is halted or unavailable for this symbol" };
  }
  const fetchedAt = quote?.fetchedAt
    ? new Date(quote.fetchedAt).getTime()
    : quote?.t
      ? Number(quote.t) * 1000
      : NaN;
  if (!Number.isFinite(fetchedAt)) {
    return { ok: false, reason: "Market price timestamp unavailable" };
  }
  if (now.getTime() - fetchedAt > QUOTE_FRESH_MS) {
    return { ok: false, reason: "Market price is stale" };
  }
  const lowerCircuit = Number(quote?.lowerCircuit);
  const upperCircuit = Number(quote?.upperCircuit);
  if (Number.isFinite(lowerCircuit) && lowerCircuit > 0 && price < lowerCircuit) {
    return { ok: false, reason: "Market price is below the lower circuit limit" };
  }
  if (Number.isFinite(upperCircuit) && upperCircuit > 0 && price > upperCircuit) {
    return { ok: false, reason: "Market price is above the upper circuit limit" };
  }
  return { ok: true, price };
};

module.exports = {
  getMarketSession,
  isExecutableQuote
};
