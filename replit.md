# Siraja

Multi-tenant SaaS platform for Quran education and memorization, serving
Quran circles, Quran academies, independent sheikhs, parents, and students.

Tenants are resolved by URL path, e.g. `siraja.website/tuwaiq`,
`siraja.website/noor`, `siraja.website/furqan` — one deployment serves
every tenant.

## Stack

- **Frontend**: Flutter (Material 3, responsive, RTL-first) — lives in
  `frontend/`, not wired into the Replit workflow (Flutter isn't run via
  a Replit workflow in this environment).
- **Backend**: Node.js + NestJS + TypeScript — lives in `backend/`, this
  is what the "Start application" workflow runs.
- **Database**: MongoDB Atlas (Mongoose ODM) — external, not a Replit
  built-in database. Connection string lives in the `MONGODB_URI` secret.
- **Auth**: Email + Password, Phone + Password (identity only, no OTP),
  Google, Apple — JWT access + refresh tokens.

## Architecture

Clean Architecture + Domain-Driven Design on both sides:

- `backend/src/modules/<context>/{domain,application,infrastructure}` — one
  bounded context per business concept (auth, tenants, users, academies,
  circles, sheikhs, students, parents, memorization, notifications,
  subscriptions). Repository Pattern + constructor Dependency Injection
  throughout; domain layer has zero framework imports.
- `frontend/lib/features/<feature>/{data,domain,presentation}` — mirrors
  the backend's bounded contexts feature-by-feature.

Full blueprints (backend, frontend, database, multi-tenancy, API,
environment config) live in `docs/architecture/`. Start at
`docs/architecture/01-overview.md`.

## Running on Replit

- Dependencies are installed at the **repo root** (`npm install` at
  `/`), not inside `backend/`. The "Start application" workflow runs
  `cd backend && nest start` with the root `node_modules/.bin` on
  `PATH` — Node's module resolution walks up to the root
  `node_modules/` for everything `backend/` imports, so there's no
  separate `backend/node_modules`. If you add a backend dependency,
  install it at the repo root, not inside `backend/`.
- The server listens on `PORT` (shared env var, set to `5000` to match
  the Replit-exposed port) and is mounted under `API_PREFIX`
  (`api/v1`), so routes are e.g. `/api/v1/quran/surahs`.
- Required configuration (see `backend/src/config/env.validation.ts`):
  - `MONGODB_URI` (secret) — MongoDB Atlas connection string, provided
    by the user.
  - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (shared env vars) —
    generated during setup; rotate if you need to invalidate all
    sessions.
  - Optional: Google/Apple OAuth credentials, SMTP email vars, and
    `MOONSHOT_API_KEY` (Phase 11 AI features) are all unset — the
    corresponding features no-op/503 gracefully rather than crashing
    the app (see `configuration.ts` comments).
- This project is backend-only in Replit; there is no web frontend
  served here to screenshot. Verify the API with `curl` against
  `/api/v1/...` routes or the workflow logs' `RouterExplorer` route
  list.

## Current status

- **Phase 1 (complete)**: folder architecture, module/feature skeletons,
  configuration scaffolding.
- **Phase 2 (complete)**: full MongoDB Atlas database architecture — all
  33 Mongoose schemas (`backend/src/database/mongoose/schemas/`), shared
  database + `tenantId` tenant isolation, indexes, validation, enums,
  soft delete. See `docs/architecture/04-database-blueprint.md` and
  `08-schema-diagrams.md`.
- **Phase 3 (complete)**: full RBAC authorization architecture —
  permission registry/seeder (`shared/authorization/`,
  `database/seeders/`), role permission matrix, permission/tenant-scope/
  resource-ownership guards (`common/guards/`), `@RequirePermissions()`/
  `@CheckOwnership()` decorators, `AuthorizationModule` wiring them as
  global guards. Super Admin bypasses all checks; Tenant Admin is
  tenant-scoped but otherwise unrestricted; Supervisor/Sheikh/Parent/
  Student are ownership-restricted. See
  `docs/architecture/09-authorization-blueprint.md`.
- **Phase 4 (complete)**: full Authentication, Session, and Device
  modules — working code (`backend/src/modules/auth/`), not just
  structure. Email+password, phone+password (identity only, no SMS),
  Google OAuth, Apple Sign In; email-only verification/reset; Argon2
  password hashing + password history; opaque refresh tokens with
  rotation + reuse detection; multi-device session tracking and
  revocation (`/auth/sessions`, `/auth/devices`); brute-force lockout +
  global rate limiting (`@nestjs/throttler`); future-ready hooks for
  MFA/Passkeys (unused fields/packages, not enforced). `tsc --noEmit`
  passes. See `docs/architecture/10-authentication-blueprint.md`.
- **Phase 5 (complete)**: full Quran Foundation Engine — Surahs, Ayahs,
  Quran Metadata (Juz/Page navigation), Tafsir (all platform-global
  reference data, no `tenantId`), Quran Search (diacritic-normalized
  `$text` search), Quran Bookmarks (+ Favorites + Last Read Position),
  and Quran Notes. See `docs/architecture/11-quran-blueprint.md`.
- **Phase 6 (complete)**: full People Domain — Students, Parents,
  Sheikhs, Supervisors, Circles, and Student Assignments.
- **Phase 7 (complete)**: full Memorization & Review Engine —
  Memorization, Reviews, Mistakes, Progress, Forecast modules.
- **Phase 8 (complete)**: full Operational Engine — Attendance, Exams,
  Assessments, Assignments, and Reporting modules.
- **Phase 9 (complete)**: Smart Mushaf Engine — ayah-level performance
  tracking, ayah notes, mistakes overlay, memorization heatmap.
- **Phase 10 (complete)**: Notifications, Messaging, Announcements,
  User Preferences, email delivery (provider-agnostic SMTP).
- **Phase 11 (complete, approved 2026-07-11)**: AI Learning Intelligence
  Architecture — text/data-grounded AI only, ASR/speech-to-text
  explicitly deferred. One `AiModule` covering Mistake Intelligence,
  Revision Recommendation, Memorization Recommendation, Forecast
  Explanation, Sheikh/Parent AI Reports, AI Insights history. Moonshot
  AI is the sole LLM vendor (`MOONSHOT_API_KEY`).

## Known follow-ups (deferred, not project tasks)

- **NestJS v11 upgrade & security remediation** (deferred until after Beta
  Testing, decided 2026-07-11): `npm audit` reports 24 vulnerabilities (7
  high, 14 moderate, 3 low, 0 critical), all fixable only via
  `npm audit fix --force`, which upgrades `@nestjs/cli`, `@nestjs/config`,
  `@nestjs/common`, and `@nestjs/platform-express` to NestJS v11 — a
  breaking change for this v10 codebase. Vulnerable packages are mostly
  build/dev tooling (glob, picomatch, tmp, inquirer, webpack via
  `@nestjs/cli`) or transitive runtime deps with low real-world exposure
  (lodash, file-type, qs, multer). Decision: ship Beta first, then take
  this on as an isolated, fully regression-tested upgrade across all 11
  phases. (Could not be filed as a formal project task from Build mode —
  add it via Planning mode when ready to schedule.)

## User preferences

None recorded yet.
