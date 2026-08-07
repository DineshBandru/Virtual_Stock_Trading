# Demo and Viva Notes

## Suggested Demo Flow

1. Open the Trade Abhyas user website.
2. Register or log in as a normal user.
3. Show the dashboard and virtual balance.
4. Search for a supported stock.
5. Open the stock detail page and review quote information.
6. Place a BUY order.
7. Show the order status, transaction entry, portfolio update, and positions update.
8. Attempt an invalid SELL quantity to demonstrate oversell protection.
9. Place or show a pending order and cancel it.
10. Add a stock to the watchlist.
11. Create a price alert.
12. Open the settings/profile section and show allowed profile fields.
13. Log in to the admin panel.
14. Show admin users, orders, transactions, and competitions monitoring.

## Screenshot Shortlist

For the final report, prefer the 12-image shortlist in `docs/screenshots/README.md`.

For PPT, prefer:

1. `03-dashboard.png`
2. `05-stock-detail.png`
3. `07-buy-order-ticket.png`
4. `09-portfolio.png`
5. `11-orders.png`
6. `18-admin-dashboard.png`
7. `23-mobile-stock-detail.png`

## Key Points to Explain

- Trade Abhyas is a virtual trading platform, not a brokerage platform.
- All balances and trades are simulated.
- The platform intentionally avoids bank details, PAN card details, and real-money settlement.
- Authentication uses hashed passwords and HTTP-only cookies.
- Admin APIs are role-protected.
- The order engine uses database transactions to protect balance and portfolio integrity.
- The audit script verifies trading consistency after execution.

## Viva Questions and Answers

| Question | Answer |
| --- | --- |
| What is Trade Abhyas? | It is a virtual stock trading platform for practicing trading concepts with virtual money. |
| Is this a real trading platform? | No. It does not connect to a broker or exchange for real execution. |
| Why is virtual trading useful? | It lets students and beginners learn order types, portfolio behavior, and P&L without financial risk. |
| What technology stack is used? | React, Vite, Tailwind CSS, Node.js, Express.js, MongoDB, Mongoose, JWT, and Socket.IO. |
| Why are there separate user and admin apps? | Separation keeps user trading workflows and admin monitoring workflows cleaner and role-specific. |
| How are passwords stored? | Passwords are hashed with bcrypt before being saved. |
| How is session security handled? | Access and refresh tokens are stored in HTTP-only cookies, and refresh tokens are stored hashed in the database. |
| How are admin routes protected? | The backend verifies authentication and checks that the user's role is admin. |
| Which order types are supported? | Market, Limit, Stop-Loss, and Stop-Limit virtual orders. |
| What happens when the market is closed? | Executable processing is skipped and eligible orders remain pending. |
| How is overselling prevented? | Before SELL execution, the backend checks that the user owns enough quantity. |
| How is overspending prevented? | Before BUY execution, the backend conditionally verifies sufficient virtual balance. |
| What is realized P&L? | It is profit or loss calculated when a holding is sold. |
| What is unrealized P&L? | It is profit or loss on holdings that are still open. |
| Why use MongoDB transactions? | They keep order, transaction, balance, and portfolio changes consistent. |
| Why is there a unique transaction per order? | It prevents duplicate execution records for the same order. |
| What does the audit script do? | It checks for invalid balances, duplicate holdings, missing transactions, and other trading inconsistencies. |
| Does the platform collect PAN or bank data? | No. Those details are not required for virtual trading and are intentionally excluded. |
| What is Socket.IO used for? | It supports real-time quote and account update events. |
| What is the future scope? | Better charting, guided lessons, richer competitions, advanced analytics, and production monitoring. |
