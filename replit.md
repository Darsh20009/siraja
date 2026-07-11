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
- **Phase 6 (complete)**: full People Domain — Students, Parents, Sheikhs, Supervisors, Circles, and Student Assignments. Six NestJS modules with full Clean Architecture (domain → application → infrastructure). Role-scoped RBAC enforced in use-cases (sheikh/parent ownership, supervisor circle-scoping). Bidirectional relationship management for circle↔sheikh, circle↔supervisor, student↔parent. Immutable StudentEnrollment audit trail for every assignment event. `tsc --noEmit` passes. See `docs/architecture/` for blueprints.
- **Phase 7 (complete)**: full Memorization & Review Engine — five NestJS modules with full Clean Architecture. MemorizationModule (record lifecycle: create → approve, COMPLETED + grade), ReviewsModule (murājaʿah sessions with retention grading and due-date scheduling), MistakesModule (per-ayah mistake tracking with type/severity/resolution status, frequency analytics), ProgressModule (materialised StudentProgress document, streak tracking, memorization/revision percentages), ForecastModule (estimated completion date, weekly/monthly projections, consistency score from last-30-days pace). Role-scoped RBAC throughout: Student sees own, Sheikh sees what they evaluated, Supervisor/Admin sees all. `tsc --noEmit` passes. Waiting on approval before Phase 8.
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
- **Phase 8 (complete)**: full Operational Engine — Attendance, Exams,
  Assessments, Assignments, and Reporting modules with full Clean
  Architecture. Attendance (present/absent/excused/late, tracked by
  student/circle/sheikh/session/date/notes), Exams (memorization/
  revision/completion categories, score/grade/result status), Assessments
  (weekly/monthly/custom periodic evaluations), Assignments (homework/
  revision/memorization tasks with assigned/due dates, completion status,
  submission notes), Reporting (student/parent/sheikh/circle/supervisor
  reports with attendance/memorization/revision rates, exam performance,
  student/circle ranking — read-only aggregation over the other modules,
  no schema of its own). Role-scoped RBAC: Student views own, Parent
  views linked children, Sheikh manages assigned students, Supervisor
  views supervised circles, Tenant Admin has full tenant access.
  `tsc --noEmit` passes. See `docs/architecture/` for blueprints. AI,
  Smart Mushaf, and Notifications explicitly out of scope for this
  phase.
- **Phase 10 (complete)**: full Communication & Notification Platform — five NestJS modules.
  NotificationsModule (inbox with read/unread, mark-all-read, archive, priority levels, deep links;
  in-app + email delivery via provider abstraction), NotificationTemplatesModule (reusable
  {{variable}} templates, global or tenant-specific, tenant overrides global for same type+channel),
  InAppMessagingModule (four thread types: Sheikh→Student, Sheikh→Parent, Admin→User,
  Supervisor→Circle; per-participant unread counts), AnnouncementsModule (GLOBAL/TENANT/CIRCLE
  scopes, DRAFT→PUBLISHED→ARCHIVED lifecycle), UserPreferencesModule (per-user channel/type/
  email/announcement preferences, upserted on first access). Email delivery is abstracted behind
  IEmailProvider (EMAIL_PROVIDER token); SmtpEmailProvider (Nodemailer) is the default — swap by
  re-binding the token in EmailModule. Configure via EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE,
  EMAIL_USER, EMAIL_PASS, EMAIL_FROM, EMAIL_FROM_NAME env vars; absent EMAIL_HOST disables email
  silently. Three new permission categories (MESSAGING, ANNOUNCEMENTS, USER_PREFERENCES) added to
  registry and role matrix. `tsc --noEmit` passes cleanly. Waiting on approval before Phase 11.
- **Phase 9 (complete)**: full Smart Mushaf Engine — five NestJS modules.
  AyahPerformanceModule owns the materialised `ayah_performance`
  collection (one doc per student+ayah ever touched; `heatmapLevel`
  derived from `confidenceScore` at write time — Excellent/Good/Needs
  Review/Weak). AyahNotesModule owns `ayah_notes` (teacher/admin-authored
  notes on a student's ayah — distinct from the self-owned Phase 5
  `quran_notes`). AyahMistakesOverlayModule and MemorizationHeatmapModule
  have no schema of their own — they read Phase 7's `quran_mistakes` and
  this phase's `ayah_performance` respectively. SmartMushafModule is a
  facade (no schema) merging ayah text + performance + notes + mistakes
  per student+surah. Wired into Memorization/Reviews/Mistakes via the
  same fire-and-forget cross-module pattern Phase 7's ProgressModule
  established. Role-scoped RBAC (new `SMART_MUSHAF` permission category):
  Sheikh/Admin write, Student/Parent/Supervisor read-only, ownership
  enforced via the new shared `assertCanAccessStudent` helper
  (`shared/authorization/student-scope.util.ts`). `tsc --noEmit` passes,
  workflow boots cleanly with all routes mapped. AI, Notifications, and
  Payments explicitly out of scope. Waiting on approval before Phase 10.
- **Backend is running.** The `Start application` workflow runs
  `cd backend && nest start` (using the root-installed `nest` CLI/
  node_modules) on port 5000, connected to a real MongoDB Atlas cluster.
  Requires `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
  secrets (configured) and `PORT=5000` env var (set). Atlas Network
  Access must allow Replit's dev IP (0.0.0.0/0 recommended, since the
  dev environment IP isn't static) or connections fail with
  `MongooseServerSelectionError`. All routes mapped and verified
  reachable (e.g. `GET /api/v1/quran/surahs` and `GET
  /api/v1/notifications` both return 401 Unauthorized as expected —
  auth guard is active). Re-verified after a project re-import
  (2026-07-11): ran `npm install` at the workspace root and restored
  the three secrets, workflow booted cleanly with no code changes
  needed. The Flutter frontend still needs a Flutter-enabled
  environment to run (not available in this Replit workspace).

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
- `MONGODB_URI`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` secrets are
  required to start the backend. Configure them via Replit's secrets manager.
  Email delivery additionally requires `EMAIL_HOST` (and optionally
  `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`,
  `EMAIL_FROM_NAME`) — absent `EMAIL_HOST` disables email silently without
  crashing the server.

## User preferences

- Enterprise-grade Clean Architecture / DDD is a hard requirement, not
  optional — keep the domain/application/infrastructure separation strict
  as features are added.
- Wait for explicit approval before implementing any feature beyond
  structure/scaffolding.
