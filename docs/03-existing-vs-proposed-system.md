# Existing System vs Proposed System

## Existing or Common Approaches

| Existing Approach | Limitation |
| --- | --- |
| Static learning material | Explains theory but does not provide practical order placement. |
| Basic stock price viewers | Show prices but do not simulate trading, accounting, or order lifecycle. |
| Simple demo paper-trading apps | Often lack realistic order types and portfolio accounting. |
| Manual spreadsheet tracking | Error-prone and not suitable for real-time practice. |
| Systems without concurrency protection | Can produce duplicate transactions or incorrect balances under simultaneous requests. |

## Proposed Trade Abhyas System

Trade Abhyas provides a full-stack virtual trading platform with:

- NSE equity instrument catalogue.
- Real-time/current market quote display.
- Historical chart data.
- Virtual capital and persistent account balances.
- Market, Limit, Stop-Loss, and Stop-Limit orders.
- Pending, Triggered, Executed, Cancelled, and Rejected order states.
- Portfolio holdings with weighted average purchase price.
- Realized and unrealized P&L.
- Watchlists and alerts.
- Role-based admin application.
- Socket.IO real-time updates.
- Financial-integrity testing and audit support.

## Important Scope Boundary

Trade Abhyas does not execute real trades on a stock exchange and does not connect to any brokerage order-routing system. All trade records are virtual records maintained inside the application database.

