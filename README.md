# Trade Abhyas

Virtual Stock Trading Platform

Trade Abhyas is a paper-trading / virtual-trading platform for learning stock-market workflows with virtual capital. It is not a real brokerage platform and does not execute real stock-exchange orders, collect bank details, or perform real-money settlement.

## Architecture

```text
apps/website -> User trading application
apps/admin   -> Separate admin control panel
backend      -> Express, MongoDB, and Socket.IO backend
docs         -> Project documentation, screenshots, and report artifacts
```

## Technology Stack

- React, Vite, Tailwind CSS
- Node.js, Express.js
- MongoDB Atlas, Mongoose
- Socket.IO
- JWT access tokens and refresh-token sessions
- bcrypt password hashing
- Yahoo Finance based market utilities and NSE instrument catalogue

## Prerequisites

- Node.js and npm
- MongoDB Atlas connection string
- Optional market/news provider keys for enhanced data feeds

## Installation

```powershell
npm install
npm --prefix backend install
npm --prefix apps/website install
npm --prefix apps/admin install
```

## Environment Configuration

Copy example files and fill local values. Never commit real `.env` files.

- Root/backend runtime: `.env.example`
- Backend production reference: `backend/.env.example`
- Website: `apps/website/.env.example`
- Admin: `apps/admin/.env.example`

Required backend values include:

- `MONGO_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `ADMIN_URL`

Production email provider credentials and deployment domains are intentionally deferred until deployment.

## Development Services

Start all local services:

```powershell
npm run dev
```

Local ports:

```text
Backend  -> http://localhost:5500
Website  -> http://localhost:3010
Admin    -> http://localhost:3016
```

Individual services:

```powershell
npm --prefix backend run dev
npm --prefix apps/website run dev
npm --prefix apps/admin run dev
```

## Health Checks

```text
GET /api/health -> process running
GET /api/ready  -> application ready and database connected
```

## NSE Instrument Synchronization

```powershell
npm --prefix backend run sync:nse
```

This command populates or updates the NSE equity instrument catalogue. It is designed to be safe to rerun.

## Testing and Audit

```powershell
npm --prefix backend run test:orders
npm --prefix backend run audit:trading
```

- `test:orders` uses the dedicated `test` database only. The test guard refuses to run against the main `vstp` database.
- `audit:trading` is a read-only financial consistency audit.

Current verified result:

```text
Order service tests: 10/10 passed
Financial integrity audit: clean
```

## Admin Provisioning

Create a normal user account first, then promote that existing user with the CLI-only script:

```powershell
npm --prefix backend run admin:promote -- --email user@example.com
```

This script:

- requires an existing user
- changes only `role: user -> admin`
- does not create or accept passwords
- does not expose password hashes or tokens
- is not available through any public HTTP endpoint

Do not hardcode admin credentials in source files or documentation.

## Database Operational Notes

Expected database separation:

```text
vstp -> application/main database
test -> automated order tests
```

Before production migrations or destructive maintenance, take an Atlas backup or export. Legacy reconciliation tooling is retained for traceability; do not rerun `reconcile:legacy --apply` unless a future audit explicitly requires it.

## Production Notes

Production configuration must provide secure environment values for MongoDB, JWT, frontend origins, cookies, and email delivery. Deployment, production domains, and production Resend/Brevo configuration are deferred and should be completed as a separate release step.
