const NSE_TIME_ZONE = "Asia/Kolkata";
const MARKET_OPEN_MINUTES = 9 * 60 + 15;
const MARKET_CLOSE_MINUTES = 15 * 60 + 30;

const getExchangeParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NSE_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    weekday: parts.weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute)
  };
};

export const getNseMarketStatus = (quote = null) => {
  const quoteState = String(quote?.marketState || quote?.tradingStatus || "").toUpperCase();
  const exchange = getExchangeParts();
  const weekend = exchange.weekday === "Sat" || exchange.weekday === "Sun";
  const timeOpen = !weekend && exchange.minutes >= MARKET_OPEN_MINUTES && exchange.minutes <= MARKET_CLOSE_MINUTES;
  const quoteOpen = ["REGULAR", "OPEN"].includes(quoteState);
  const quoteClosed = ["CLOSED", "POST", "POSTPOST", "PRE", "PREPRE", "PREMARKET", "POSTMARKET"].includes(quoteState);
  const open = quoteOpen || (!quoteClosed && timeOpen);
  const displayState = open
    ? "Market Open"
    : ["PRE", "PREPRE", "PREMARKET"].includes(quoteState)
      ? "Pre-Market"
      : ["POST", "POSTPOST", "POSTMARKET"].includes(quoteState)
        ? "Post-Market"
        : "Market Closed";

  return {
    open,
    label: `NSE ${displayState}`,
    displayState,
    dot: open ? "bg-emerald-400" : "bg-amber-400",
    textTone: open ? "text-emerald-400" : "text-amber-300",
    tone: open ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200",
    helper: open
      ? "Eligible Market orders may execute using available market data."
      : "Market orders placed now will remain Pending until the market opens.",
    hours: "Trading hours: 09:15 AM - 03:30 PM IST",
    clock: new Date().toLocaleTimeString("en-IN", {
      timeZone: NSE_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }),
    source: quoteState ? "quote market state with NSE-hours fallback" : "NSE-hours fallback",
    timeZone: NSE_TIME_ZONE
  };
};
