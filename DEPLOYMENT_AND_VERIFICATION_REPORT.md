Deployment & Verification Report

Summary
- Date: 2026-05-31
- Branch with cleanup: `cleanup/remove-temp-scripts` (pushed to origin).
- Action performed: removed temporary verification & migration scripts, verified application runs locally (health, auth, protected endpoints, stocks search, Socket.IO connect).

Quick smoke test results (local)
- `GET /api/health` -> 200 {"status":"ok"}
- Auth: Register and Login succeeded for a generated test user (cookies set).
- Protected endpoint: `/api/portfolio` accessible after login.
- Stocks search: `/api/stocks/search?q=RELIANCE` returned results.
- Socket.IO: client connected and received events (connection successful).

Files removed
- `scripts/verify_full.js`
- `scripts/verify_phase1.js`
- `scripts/verify_phase2.js`
- `scripts/verify_rate_limit.js`
- `scripts/refresh_migration_check.js`
- `scripts/refresh_migrate_tokens.js`

Commit/branch
- Branch: `cleanup/remove-temp-scripts`
- Commit message: "chore: remove temporary verification and migration scripts"
- Remote: pushed to `origin` (PR URL presented by remote at push time).

Local reproduction commands (copy/paste)
- Start server (production-style):
```powershell
npm --prefix server run start
```
- Start client dev server (if needed):
```powershell
npm --prefix client run dev
```
- Build client for production:
```powershell
npm --prefix client run build
```
- Smoke-test (example register/login/portfolio/stock-search) using PowerShell script (used during verification):
```powershell
# in repo root
./.tmp_smoke_test.ps1  # (temporary script used; removed after verification)
```
(If you re-run, use the manual sequence with `Invoke-RestMethod` shown earlier or a small script that POSTs /api/auth/register -> /api/auth/login -> hit protected routes.)

Environment variables (server)
- REQUIRED (production):
  - `MONGO_URI` — MongoDB Atlas connection string (use SRV/TLS). Example: `mongodb+srv://<user>:<pw>@cluster0.mongodb.net/dbname?retryWrites=true&w=majority`
  - `JWT_SECRET` — strong secret for signing JWTs.
  - `CLIENT_URL` — comma-separated allowed origins (Vercel domain + local dev). E.g. `https://your-app.vercel.app,http://localhost:3000`.
  - `FINNHUB_API_KEY` — (if used).
  - `PORT` — Render provides this; default 5000 locally.
- OPTIONAL:
  - `SENTRY_DSN` — for error monitoring.
  - `NODE_ENV=production`

Environment variables (client)
- `VITE_API_URL` — public base URL for backend API (e.g., `https://api.example.com`). Set in Vercel environment variables (prefixed with `VITE_`).

Render deployment steps (backend)
1. Create a new Web Service on Render.
2. Connect to your GitHub repo and pick branch (e.g., `main`).
3. Set the Service to `Node` and set the build and start commands as per `server/package.json` (start: `node index.js`).
4. Add environment variables listed above in Render UI (use Render secrets for `MONGO_URI`, `JWT_SECRET`, `FINNHUB_API_KEY`).
5. Set health check path to `/api/health` (HTTP). Set appropriate instance size (start small, e.g., 1x CPU).
6. For multi-instance high availability, configure at least 2 instances and use a shared rate-limiter (Redis). Replace in-memory `express-rate-limit` with a Redis-backed limiter (e.g., `rate-limit-redis` or `@upstash/ratelimit`).
7. Configure log forwarding / alerts.
8. Deploy and watch the first deployment logs for Mongo connection success and port bind.

Vercel deployment steps (frontend)
1. In Vercel, import the `client` project (or root repo and set build to `npm --prefix client run build`).
2. Set `Build Command` to `npm --prefix client run build` and `Output Directory` to `client/dist` (or `client/dist` depending on your Vite config).
3. Add `VITE_API_URL` env var pointing to the Render service URL.
4. Configure domain and test preview deployments.

Mongo Atlas checklist
- Use TLS/SSL (default with SRV).
- Allowlist: either allow Render / Vercel IP ranges (if needed) or use VPC peering/private networking.
- Enable backups and set retention policy.
- Ensure indexes:
  - `RefreshToken.tokenHash` -> unique index.
  - `RefreshToken.expires` -> TTL index if desired.
  - Any other query-heavy fields indexed (e.g., `User.email` unique).
- Monitor slow queries & CPU.

Post-deployment testing checklist
1. Health check: `GET /api/health` -> 200.
2. Auth: Register -> Login -> Verify `token` and `refreshToken` cookies set. Try access to a protected endpoint.
3. Refresh rotation: Call `/api/auth/refresh` after login, confirm rotation (old refresh token rejected).
4. Protected endpoints: call `/api/portfolio`, `/api/watchlist` to assert correct responses.
5. Trade endpoints: perform a dry-run trade or place a small trade (verify rate limits).
6. Admin: verify admin role endpoints with an admin account.
7. Realtime: connect Socket.IO client from the deployed frontend; verify `prices:update` events delivered and no CORS/socket errors.
8. Database: confirm `RefreshToken` docs stored with `tokenHash` (no plain tokens), and expired tokens are eventually removed.
9. Load test (optional): smoke with low-volume concurrency to confirm rate-limiter behavior; for multi-instance use distributed limiter.

Rollback & emergency steps
- If deployment fails or app crashes due to DB connectivity, rollback to previous working deployment via Render/Vercel UI.
- If `JWT_SECRET` or DB credentials were exposed, rotate them immediately and restart services.

Notes & recommendations
- Replace in-memory rate-limiter with Redis for production multi-instance deployments.
- Consider rotating any secrets that were present in local `.env` if they were committed or exposed.
- Keep the migration scripts in a private safe place if you need to re-run migrations later (they were removed from repo for cleanliness).

Appendix — Useful commands
- Build client:
```bash
npm --prefix client run build
```
- Start server locally:
```bash
npm --prefix server run start
```
- Run client dev:
```bash
npm --prefix client run dev
```

Contact / next steps
- I can produce a one-click Render/Vercel runbook with exact UI steps and screenshots, or convert this report into a CI/CD checklist (GitHub Actions) that deploys both services automatically. Reply with which you prefer.
