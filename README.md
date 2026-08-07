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
- apps/website: React customer-facing trading app
- apps/admin: React admin console
- backend: Express API, Socket.IO server, and MongoDB models/services

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
2. Install backend dependencies:
   - npm --prefix backend install
3. Install website dependencies:
   - npm --prefix apps/website install
4. Install admin dependencies:
   - npm --prefix apps/admin install
5. Start dev servers:
   - npm run dev

Local URLs:
- Website: http://localhost:3000
- Admin: http://localhost:3001
- Backend API: http://localhost:5000

## Scripts
- npm run dev: Concurrently starts backend, website, and admin dev servers.
- npm start: Starts the backend server only.
- npm --prefix apps/website run dev: Starts the website Vite dev server.
- npm --prefix apps/admin run dev: Starts the admin Vite dev server.
- node backend/seed.js: Seeds database with dummy data.

## API Endpoints
Auth:
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me
- PUT /api/auth/tour

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

## Deployment

### Frontend (Vercel)
The apps/website directory contains a vercel.json optimized for Vite SPAs.
1. Import the repository into Vercel and set the Root Directory to apps/website.
2. Add necessary frontend Environment Variables (such as VITE_API_URL pointing to the Render backend).

### Backend (Render)
The backend directory includes a render.yaml blueprint.
1. Connect Render to the repository and select the backend directory as a Web Service.
2. Build Command: npm install, Start Command: node index.js.
3. Fill missing environment variables inside the Dashboard (MONGO_URI, JWT_SECRET).

## Screenshots
Add screenshots of the dashboard, stock detail, and admin panel here.
