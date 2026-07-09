# Environment Configuration

## Backend (`backend/.env`, see `backend/.env.example`)

| Variable                | Purpose                                             |
|--------------------------|------------------------------------------------------|
| `NODE_ENV`               | `development` \| `production` \| `test`              |
| `PORT`                   | HTTP port                                             |
| `API_PREFIX`             | Global route prefix (default `api/v1`)                |
| `MONGODB_URI`            | MongoDB Atlas connection string                       |
| `MONGODB_DB_NAME`        | Database name                                          |
| `TENANCY_STRATEGY`       | `path` (URL-path-based tenant resolution)              |
| `DEFAULT_TENANT_SLUG`    | Fallback slug for non-tenant-scoped/dev requests       |
| `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES_IN`   | Access token signing secret + TTL      |
| `JWT_REFRESH_SECRET` / `JWT_REFRESH_EXPIRES_IN` | Refresh token signing secret + TTL     |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth |
| `APPLE_*`                | Apple Sign In credentials                              |
| `SMS_PROVIDER_*`         | Phone/OTP delivery provider credentials                |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | Rate limiting window/threshold               |
| `CORS_ORIGINS`           | Comma-separated allowed origins                        |
| `LOG_LEVEL`              | Logging verbosity                                      |

Validated at boot by `backend/src/config/env.validation.ts` (class-validator);
the app fails fast if required variables are missing. Loaded/typed access
via `backend/src/config/configuration.ts` and Nest's `ConfigService`.

**Secrets are never committed.** `backend/.env` is git-ignored;
`backend/.env.example` documents every key with placeholder values. When
running on Replit, real secrets (JWT signing keys, `MONGODB_URI`, OAuth
credentials, SMS provider credentials) are provided via Replit's
environment/secrets manager, not hardcoded.

## Frontend (Flutter)

Build-time configuration (API base URL, OAuth client IDs) will be provided
via `--dart-define` flags or a generated `lib/core/constants/env.dart`
(not yet created — structure only) rather than a committed `.env` file,
since Flutter bundles are client-side artifacts.

## Multi-environment strategy

`development`, `staging`, `production` each get their own MongoDB Atlas
database (or cluster, for production isolation), OAuth callback URLs, and
JWT secrets — never shared across environments.
