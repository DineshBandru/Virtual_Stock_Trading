# Virtual Stock Trading Platform

Production-grade MERN virtual trading terminal for students and beginners to practice with virtual capital. Built for real-time market data, AI signals, and trading competitions.

## Features
- JWT authentication with HTTP-only cookies
- Virtual wallet and live portfolio valuation
- Real-time stock quotes with Socket.IO
- Candlestick charts with TradingView lightweight-charts
- Rule-based AI signal (SMA/RSI)
- Watchlist, alerts, and notifications
- Leaderboards and trading competitions
- Admin panel with platform statistics

## Tech Stack
Frontend: React 18, Vite, Tailwind CSS, Framer Motion, Recharts, lightweight-charts
Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO

## Folder Structure
- client: React frontend
- server: Express backend

## Environment Variables
Create .env files based on .env.example.

Root .env.example:
- MONGO_URI
- JWT_SECRET
- FINNHUB_API_KEY
- NEWS_API_KEY
- PORT
- CLIENT_URL
- VITE_API_URL

Client .env.example:
- VITE_API_URL

## Install & Run
1. Install root dependencies:
   - npm install
2. Install server dependencies:
   - npm --prefix server install
3. Install client dependencies:
   - npm --prefix client install
4. Start dev servers:
   - npm run dev

## API Endpoints
Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

Stocks:
- GET /api/stocks/search?q=SYMBOL
- GET /api/stocks/:symbol
- GET /api/stocks/:symbol/history?period=1M
- GET /api/stocks/trending

Trading:
- POST /api/trade/buy
- POST /api/trade/sell

Portfolio:
- GET /api/portfolio
- GET /api/portfolio/analytics

Transactions:
- GET /api/transactions
- GET /api/transactions/export

Watchlist:
- GET /api/watchlist
- POST /api/watchlist/add
- DELETE /api/watchlist/remove/:symbol

Alerts:
- GET /api/alerts
- POST /api/alerts
- DELETE /api/alerts/:id

Leaderboard:
- GET /api/leaderboard

Competitions:
- GET /api/competitions
- POST /api/competitions/join/:id
- GET /api/competitions/:id/leaderboard

News:
- GET /api/news
- GET /api/news/:symbol

Admin:
- GET /api/admin/users
- GET /api/admin/transactions
- POST /api/admin/competitions
- GET /api/admin/stats

## Screenshots
Add screenshots of the dashboard, stock detail, and admin panel here.
