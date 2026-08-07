# Requirements

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-01 | Users can register, login, logout, and maintain sessions. |
| FR-02 | Users can reset passwords through a secure token-based workflow. |
| FR-03 | Users can search active NSE equity instruments. |
| FR-04 | Users can view stock detail pages with quote and historical chart data. |
| FR-05 | Users can place BUY and SELL orders. |
| FR-06 | The system supports Market, Limit, Stop-Loss, and Stop-Limit orders. |
| FR-07 | Orders can be Pending, Triggered, Executed, Cancelled, or Rejected. |
| FR-08 | The system records transactions only for executed orders. |
| FR-09 | The system maintains portfolio holdings and weighted average price. |
| FR-10 | The system calculates open and closed positions. |
| FR-11 | Users can manage watchlists. |
| FR-12 | Users can create and delete price alerts. |
| FR-13 | Users can view leaderboard and competition pages. |
| FR-14 | Admin users can view platform statistics, users, orders, transactions, and competitions. |
| FR-15 | Normal users cannot access admin APIs. |

## Non-Functional Requirements

| Category | Requirement |
| --- | --- |
| Security | Passwords must be hashed; admin APIs must be role-protected. |
| Reliability | Financial records must remain consistent during concurrent order requests. |
| Data Integrity | Executed orders must have exactly one matching transaction. |
| Performance | Common queries use indexed MongoDB fields where appropriate. |
| Responsiveness | Website and admin UI support desktop and mobile navigation. |
| Maintainability | Backend is separated into routes, controllers, services, models, and scripts. |
| Scalability | Stateless HTTP APIs and MongoDB Atlas support future deployment scaling. |
| Availability | Health and readiness endpoints expose backend state. |

## Software Requirements

| Component | Technology |
| --- | --- |
| Runtime | Node.js |
| Backend Framework | Express.js |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| User/Admin UI | React 18 |
| Frontend Build Tool | Vite |
| Styling | Tailwind CSS |
| Charts | lightweight-charts, Recharts |
| Real-Time | Socket.IO |
| Authentication | JSON Web Token, refresh token documents |
| Password Hashing | bcryptjs |
| Validation/Security Middleware | express-validator, helmet, CORS, mongo-sanitize, xss-clean |
| Market Data | yahoo-finance2 utility and NSE instrument CSV sync |
| Email Delivery | Resend-compatible API service, configured by environment |

