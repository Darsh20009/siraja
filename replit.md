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
- **Auth**: Email, Phone (OTP), Google, Apple — JWT access + refresh tokens

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
- No services, controllers, APIs, or working auth flow exist yet — schema
  architecture only. No run workflow configured. Waiting on approval
  before Phase 3.

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
