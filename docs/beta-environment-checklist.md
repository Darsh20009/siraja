# Beta Environment Checklist

Environment variables the backend reads (`backend/src/config/configuration.ts`). Grouped by whether Beta can run without them.

## Required for Beta to function at all
- `MONGODB_URI` — connection string. **Note:** the database actually used is whatever database the URI itself points to; `MONGODB_DB_NAME` (below) is only applied if set, so don't assume the `configuration.ts` default name.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — session signing. Must be long, random, and different from each other.

## Recommended before inviting testers
- `MONGODB_DB_NAME` — set explicitly so the Beta database has a predictable name (e.g. `siraja_beta`) instead of relying on whatever the URI's connection string happens to default to.
- `CORS_ORIGINS` — comma-separated list of the frontend origin(s) that will call this API. Empty means no cross-origin browser client can call it.
- `APP_URL` — used inside email templates (verification/reset links).
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME` — without these, `MailerService` logs a warning and skips sending; verification/reset/suspicious-login emails silently never arrive. Required for a realistic Beta (testers need working email verification and password reset).
- `THROTTLE_TTL`, `THROTTLE_LIMIT` — currently default to 100 requests / 60s per IP, applied globally. Reviewed as adequate for a 20–50 user closed Beta; revisit if testers share a NAT'd IP (school network) and hit false-positive rate limiting.

## Optional — feature gracefully degrades without them
- `MOONSHOT_API_KEY` (+ `MOONSHOT_BASE_URL`, `MOONSHOT_MODEL`, pricing/budget vars) — without it, every `/api/v1/ai/*` endpoint returns `503 AI_UNAVAILABLE`; the app still boots and every other feature works. Set before testers are asked to specifically evaluate AI features.
- `AI_DAILY_BUDGET_USD` / `AI_MONTHLY_BUDGET_USD` — default to a conservative $3/day, $75/month platform-wide cap.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — Google OAuth login. Without them the `/auth/google*` routes exist but will fail; email/password registration and login are unaffected.
- `APPLE_CLIENT_ID` / `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` / `APPLE_CALLBACK_URL` — Apple OAuth login, same caveat as Google above.
- `SMS_PROVIDER_ACCOUNT_SID` / `SMS_PROVIDER_AUTH_TOKEN` / `SMS_PROVIDER_FROM_NUMBER` — not currently wired to any code path found in this audit; safe to leave unset for Beta.

## Not read by the application (safe to ignore, kept for completeness)
- `SESSION_SECRET` — not referenced anywhere in the backend codebase as of this audit. No action needed unless a future feature (e.g. server-side session middleware) starts using it.

## Operational
- `NODE_ENV` — set to something other than `production` to keep the Swagger docs (`/docs`) available for Beta testers/integrators; set to `production` to hide them.
- `PORT`, `API_PREFIX`, `LOG_LEVEL` — safe to leave at defaults (`3000`/`5000` on Replit, `api/v1`, `debug`) unless there's a specific reason to change them.

## Tenant setup for Beta
- Tenant resolution is header-based (`X-Tenant-Slug`) — see `siraja-tenant-resolution.md` in agent memory for the architecture. Every Beta tester's client must send this header on every request to a tenant-scoped route.
- Run `npm run seed:beta-demo` (from `backend/`, with the server already running) to create a demo tenant (`siraja-demo`) with one login per role (Tenant Admin, Sheikh, Parent, Student) — printed to stdout on first run, safe to re-run.
