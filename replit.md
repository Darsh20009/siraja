# Siraja

Multi-tenant SaaS platform for Quran education and memorization, serving
Quran circles, Quran academies, independent sheikhs, parents, and students.

Tenants are resolved by URL path, e.g. `siraja.website/tuwaiq`,
`siraja.website/noor`, `siraja.website/furqan` — one deployment serves
every tenant.

## Stack

- **Frontend**: Flutter (Material 3, responsive, RTL-first)
- **Backend**: Node.js + NestJS + TypeScript
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Auth**: Email + Password, Phone + Password (identity only, no OTP),
  Google, Apple — JWT access + refresh tokens

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
- **Phase 5 (complete)**: full Quran Foundation Engine — working code,
  not just structure. Surahs, Ayahs, Quran Metadata (Juz/Page
  navigation), Tafsir (all platform-global reference data, no
  `tenantId`), Quran Search (diacritic-normalized `$text` search across
  Surah names + Ayah text, composed over the Surah/Ayah repositories —
  no schema of its own), Quran Bookmarks (+ Favorites + Last Read
  Position), and Quran Notes (Ayah/Surah-scoped, tenant + user scoped,
  ownership enforced directly by `(tenantId, userId)` rather than the
  Phase 3 `ResourceOwnershipGuard`). New `quran`/`quran_bookmarks`/
  `quran_notes` permission categories granted to every authenticated
  role. `tsc --noEmit` passes. See
  `docs/architecture/11-quran-blueprint.md`. AI features, the
  Memorization Engine, and Teacher Features are explicitly out of scope
  for this phase.
- No run workflow configured (Flutter frontend still needs a
  Flutter-enabled environment to run). Waiting on approval before Phase 6.

## Environment

- Node.js 20 is installed in this workspace. Backend npm dependencies are
  installed at the **workspace root** (`/package.json`, `/node_modules`)
  via Replit's package manager, not inside `backend/` — `backend/package.json`
  documents the same dependency set for portability if the backend is
  ever extracted to its own repo/deployment. `tsc --noEmit` against
  `backend/tsconfig.json` passes cleanly using the root-installed
  TypeScript.
- Flutter/Dart SDK is not installed in this Replit workspace (not
  available as a Replit module); `frontend/` is structure-only and will
  need a Flutter-enabled environment to actually run.
- `MONGODB_URI` and JWT secrets are not yet configured — see
  `backend/.env.example` for the full list to be requested via Replit's
  secrets manager when auth/database features are implemented.

## User preferences

- Enterprise-grade Clean Architecture / DDD is a hard requirement, not
  optional — keep the domain/application/infrastructure separation strict
  as features are added.
- Wait for explicit approval before implementing any feature beyond
  structure/scaffolding.
