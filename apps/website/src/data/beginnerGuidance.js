export const guidanceHelp = {
  availableBalance: "Virtual cash available for new Buy orders. Buying reduces it and selling executed shares adds it back.",
  averagePrice: "The weighted average price you paid for the shares you currently hold.",
  currentValue: "The current estimated value of your holding using the latest available price.",
  realizedPnl: "Profit or loss recorded after shares have been sold.",
  unrealizedPnl: "Your current profit or loss on shares you still own. It changes as the market price changes.",
  winRate: "The percentage of closed trade episodes that ended with realized profit.",
  drawdown: "The largest fall from a previous realized-equity peak. It is calculated from closed trades only.",
  averageWin: "The average realized profit across winning closed trades.",
  averageLoss: "The average realized loss across losing closed trades.",
  marketOrder: "Attempts to trade at the available market price when the market is open.",
  limitPrice: "For Buy, this is the highest price you accept. For Sell, it is the lowest price you accept.",
  triggerPrice: "The price level that activates a stop order.",
  stopLoss: "A trigger-based order that can help exit when the market moves against your position.",
  stopLimit: "First waits for the trigger price, then behaves like a Limit order.",
  pending: "The order is accepted but has not executed yet.",
  triggered: "The trigger condition has been reached and the order is now active.",
  executed: "The trade completed and will appear in Transactions.",
  rejected: "The order could not be accepted or executed, usually because a required condition was not met.",
  cancelled: "The order was cancelled before execution, so no trade occurred."
};

export const startTradingSteps = [
  "Search for an NSE stock",
  "Open the stock details",
  "Buy a small quantity",
  "Check your Portfolio",
  "Sell when you want to exit",
  "Review your P&L and Transactions"
];

export const beforeFirstTradeConcepts = [
  {
    title: "Stock",
    body: "A stock represents a company listed in the market. In Trade Abhyas you practise with NSE symbols such as RELIANCE.NS."
  },
  {
    title: "Share",
    body: "One share is one unit of a stock. Quantity means how many shares you want to buy or sell."
  },
  {
    title: "Market Price",
    body: "The latest available price shown for the stock. It can change as new market data arrives."
  },
  {
    title: "BUY",
    body: "A Buy order uses your virtual cash and adds executed shares to your portfolio."
  },
  {
    title: "SELL",
    body: "A Sell order exits shares you already hold and adds virtual cash back after execution."
  },
  {
    title: "Quantity",
    body: "The number of shares in the order. Beginners should start small while learning the workflow."
  }
];

export const orderTypeGuide = [
  {
    title: "Market",
    body: "Attempts to trade at the available market price when the market is open."
  },
  {
    title: "Limit",
    body: "You choose the maximum buying price or minimum selling price. The order waits until the price condition is satisfied."
  },
  {
    title: "Stop-Loss",
    body: "Uses a trigger price to help exit a position when the market moves against you."
  },
  {
    title: "Stop-Limit",
    body: "First waits for the trigger price, then behaves like a Limit order."
  }
];

export const orderTypeDecisionGuide = [
  {
    title: "I want the simplest practice trade",
    recommendation: "Market",
    body: "Use when you are learning the basic Buy or Sell flow and are comfortable with the currently available price."
  },
  {
    title: "I only want a specific price or better",
    recommendation: "Limit",
    body: "Use when price matters more than immediate execution. The order may stay Pending if the condition is not met."
  },
  {
    title: "I want to practise exit protection",
    recommendation: "Stop-Loss",
    body: "Use after you understand triggers. It activates only when the trigger price is reached."
  },
  {
    title: "I want trigger plus price control",
    recommendation: "Stop-Limit",
    body: "Use when you understand both trigger price and limit price. It is more precise, but can remain unexecuted."
  }
];

export const orderStatusGuide = [
  { title: "Pending", body: "Your order has been accepted but has not executed yet. It is waiting for the required market or price condition." },
  { title: "Triggered", body: "Your stop condition was reached. The order is now waiting for its execution condition." },
  { title: "Executed", body: "Your virtual trade was completed successfully. Check Portfolio and Transactions for the updated result." },
  { title: "Cancelled", body: "The order was cancelled before execution, so no trade occurred." },
  { title: "Rejected", body: "The order could not be executed. Review the reason and edit the order if needed." }
];

export const orderStatusGuidance = orderStatusGuide.reduce((acc, item) => {
  acc[item.title] = {
    title: item.title,
    body: item.body
  };
  return acc;
}, {});

export const workedTradingExample = {
  title: "Example only: learning the math",
  scenario: "You start with Rs. 10,00,000 virtual cash and practise on an imaginary stock called ABC Ltd.",
  steps: [
    "ABC Ltd is available at Rs. 100.",
    "You place a Buy order for 5 shares.",
    "Approx order value is 5 x Rs. 100 = Rs. 500.",
    "If the order executes, your virtual cash becomes Rs. 9,99,500 and your portfolio shows 5 shares.",
    "Later, if ABC Ltd is Rs. 110, your current value is 5 x Rs. 110 = Rs. 550.",
    "Your unrealized P&L is Rs. 50 while you still hold the shares.",
    "If you sell all 5 shares at Rs. 110, the Rs. 50 becomes realized P&L and appears in Transactions."
  ]
};

export const orderLifecycleSteps = [
  {
    title: "You submit an order",
    body: "The ticket checks symbol, quantity, virtual balance, holdings, and required price fields."
  },
  {
    title: "The platform accepts or rejects it",
    body: "Rejected means a required condition failed. No virtual trade is created."
  },
  {
    title: "Accepted orders may wait",
    body: "Pending orders wait for market hours or price conditions. Stop orders may become Triggered first."
  },
  {
    title: "Execution updates your account",
    body: "Executed Buy orders update Portfolio. Executed Sell orders update Portfolio, Positions, and Transactions."
  },
  {
    title: "You review the record",
    body: "Orders show the instruction history. Transactions show only completed trades."
  }
];

export const beginnerMistakes = [
  {
    title: "Buying too many shares at once",
    safeguard: "Start with a small virtual quantity and read the review screen before confirming."
  },
  {
    title: "Using Sell before owning shares",
    safeguard: "Check Portfolio first. The platform rejects Sell orders above your available holding."
  },
  {
    title: "Confusing Orders and Transactions",
    safeguard: "Use Orders for status tracking and Transactions for executed trade history."
  },
  {
    title: "Expecting Market orders to execute when closed",
    safeguard: "Check the market status badge before placing the order."
  },
  {
    title: "Using stop orders without understanding triggers",
    safeguard: "Read the trigger and limit explanations before using Stop-Loss or Stop-Limit."
  }
];

export const glossaryTerms = [
  ["Average Price", "Weighted average buy price of the shares you currently hold."],
  ["BUY", "A virtual instruction to purchase shares using available virtual cash."],
  ["Executed", "The order completed and created a transaction."],
  ["Holding", "Shares you currently own in your virtual portfolio."],
  ["Limit Price", "The maximum Buy price or minimum Sell price you accept."],
  ["Market Order", "An order that attempts to trade at the available market price."],
  ["Pending", "Accepted but not yet executed."],
  ["Portfolio", "The list of shares you currently hold."],
  ["Quantity", "The number of shares in an order."],
  ["Realized P&L", "Profit or loss after selling shares."],
  ["Rejected", "The order did not pass required checks or execution conditions."],
  ["SELL", "A virtual instruction to exit shares you already hold."],
  ["Stop-Limit", "A trigger-based order that becomes a Limit order after activation."],
  ["Stop-Loss", "A trigger-based order used to practise exit protection."],
  ["Transactions", "Only the trades that actually executed."],
  ["Trigger Price", "The price level that activates a stop order."],
  ["Unrealized P&L", "Profit or loss on shares still held."],
  ["Virtual Cash", "Practice money used only inside Trade Abhyas."]
];

export const firstTradeWalkthroughSteps = [
  "Search for any NSE stock you want to practise with.",
  "Open the stock detail page and review price, chart, and market status.",
  "Choose BUY, keep quantity small, and pick an order type you understand.",
  "Use Review Order to check virtual cash impact before confirming.",
  "After execution, open Portfolio and Transactions to see what changed."
];

export const rejectionReasonGuidance = [
  {
    matches: ["insufficient", "fund", "balance", "cash"],
    title: "Virtual cash is not enough",
    body: "Reduce quantity or choose a lower order value. Trade Abhyas never asks for bank details because this is virtual money only."
  },
  {
    matches: ["holding", "shares", "quantity", "sell"],
    title: "You may not own enough shares",
    body: "Open Portfolio to confirm your available quantity before placing a Sell order."
  },
  {
    matches: ["market", "closed", "session", "hours"],
    title: "Market session condition was not met",
    body: "Check the market status badge. Some orders wait for trading hours; others may be rejected if required market data is unavailable."
  },
  {
    matches: ["limit", "trigger", "price"],
    title: "Price fields need attention",
    body: "Review the limit and trigger prices. Stop-Limit orders need both values in a valid relationship."
  },
  {
    matches: ["symbol", "nse"],
    title: "Stock symbol needs correction",
    body: "Use a valid NSE symbol from search, usually ending with .NS."
  }
];

export const getRejectionGuidance = (message = "") => {
  const normalized = String(message).toLowerCase();
  return (
    rejectionReasonGuidance.find((item) =>
      item.matches.some((keyword) => normalized.includes(keyword))
    ) || {
      title: "Review and try again",
      body: "No virtual trade happened. Check the order fields, read the reason, then edit the order if needed."
    }
  );
};

export const replayTourEventName = "tradeabhyas:replay-tour";
export const firstTradeGuideEventName = "tradeabhyas:first-trade-guide";
