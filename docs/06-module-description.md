# Module Description

## Module Summary

Trade Abhyas is organized into user-facing modules, administrator modules, backend service modules, and data models. Each module has a specific role in supporting virtual trading while keeping real-money and banking activity outside the system.

| Module | Purpose | Input | Processing | Output |
| --- | --- | --- | --- | --- |
| Authentication | Securely access the platform. | Name, email, password, login credentials, reset token. | Hash password, verify credentials, issue/revoke token cookies. | Authenticated or rejected session. |
| User Account | Maintain allowed user profile data. | Name, email, mobile number, avatar/preferences. | Validate and update account fields without financial/KYC data. | Updated user profile. |
| Instrument/Search | Discover supported NSE equity instruments. | Search text or symbol. | Query instrument catalogue and normalize symbols. | Matching stocks and selected instrument. |
| Market Data | Provide current and historical market information. | Symbol and timeframe. | Fetch quote/history/profile data and normalize response. | Quote, history, company data, availability status. |
| Stock Detail/Chart | Present instrument-specific trading information. | Selected stock symbol. | Load market data, chart data, and trading controls. | Stock detail screen with chart and order actions. |
| Trading/Order Management | Submit and track paper orders. | Symbol, side, quantity, order type, trigger/limit prices. | Validate request and store or process order lifecycle. | Pending, triggered, executed, cancelled, or rejected order. |
| Trading Engine | Execute valid virtual orders safely. | Order record, user balance, holdings, executable quote. | Check market session, quote validity, funds, holdings, and concurrency. | Balance, portfolio, transaction, and order updates. |
| Portfolio | Track active holdings. | Executed BUY/SELL transactions and latest quotes. | Maintain quantity, average buy price, invested value, and valuation. | Holding list and portfolio value. |
| Positions | Show current exposure. | Holdings and latest prices. | Combine holding data with market prices. | Quantity, average price, market value, unrealized P&L. |
| Transactions | Record completed paper trades. | Executed order details. | Create one immutable transaction per executed order. | Trade history for user review and audit. |
| Watchlist | Organize stocks for tracking. | User-selected symbols and list names. | Add/remove symbols and maintain named lists. | Personalized watchlist. |
| Alerts | Track saved price levels. | Symbol, target price, above/below condition. | Compare live quote with alert condition and mark triggered alerts. | Alert status and notification events. |
| Real-Time Updates | Push live account and market changes. | Authenticated socket connection and symbol subscriptions. | Join user/symbol channels and emit relevant events. | Quote, order, portfolio, alert, and analytics updates. |
| Competitions | Support simulated contests. | Competition details and join requests. | Track participants and virtual balances. | Competition standings and participant records. |
| Admin Panel | Provide operational monitoring. | Admin credentials and admin API requests. | Verify admin role and load users/orders/transactions/competitions. | Admin-only dashboard views. |
| Password Recovery | Reset forgotten passwords safely. | Email, reset token, new password. | Hash reset token, validate expiry, update password, revoke sessions. | Reset password and new login eligibility. |
| Audit Scripts | Verify trading integrity. | Current database records. | Check duplicate transactions, invalid balances, holdings, and mismatches. | Integrity report with issue counts. |

## User Website Modules

The user website is a React application that includes dashboard, trading, portfolio, positions, transactions, orders, watchlist, alerts, analytics, leaderboard, competitions, and settings pages. Navigation is protected through authentication context and route guards.

## Admin Application Modules

The admin application is a separate React application. It uses the same backend authentication system, but access is restricted to users with the `admin` role. It supports monitoring rather than direct financial mutation.

## Backend Modules

Backend modules are exposed as REST APIs under `/api`. Major route groups include authentication, stocks, market depth, trade, portfolio, transactions, positions, watchlist, alerts, leaderboard, competitions, news, orders, and admin.

## Real-Time Module

Socket.IO provides authenticated real-time updates for market data and trading changes. Users can subscribe to symbols and receive relevant quote, order, portfolio, transaction, alert, analytics, and leaderboard updates.

## Screenshot Evidence

Module screenshots are available in `docs/screenshots/`.

Recommended module evidence:

- `04-stock-search.png` - Instrument/Search module.
- `07-buy-order-ticket.png` and `08-sell-order-ticket.png` - Trading/Order Management module.
- `09-portfolio.png`, `10-positions.png`, `11-orders.png`, and `12-transactions.png` - Portfolio, Positions, Orders, and Transactions modules.
- `13-watchlist.png` and `14-alerts.png` - Watchlist and Alerts modules.
- `18-admin-dashboard.png`, `19-admin-users.png`, `20-admin-orders.png`, and `21-admin-transactions.png` - Admin module.
