---
name: Siraja Phase 12A Platform Foundation
description: Architecture decisions, file layout, and constraints for Phase 12A (Users module, Tenant management, Email templates, Storage layer, Quran seeder)
---

# Siraja Phase 12A — Platform Foundation Architecture

## Users Module (`src/modules/users/`)

**Endpoints implemented:**
- `GET /users/me` — returns UserProfileResponse + NotificationPreferencesDto (merged from `users` + `user_preferences` collections)
- `PATCH /users/me` — update fullName, avatarUrl, gender
- `PATCH /users/me/language` — update preferredLocale (stored on user doc)
- `PATCH /users/me/notifications` — upsert into `user_preferences` collection

**Pattern:** `USER_REPOSITORY` symbol token, `UserRepository` wraps `users` collection. `UserPreferences` model injected directly in use-cases that need it.

**Key file:** `application/use-cases/get-me.use-case.ts` — joins user + prefs, returns flat `UserProfileResponse`.

**Why:** User preferences live in separate `user_preferences` collection (Phase 10 decision) — always upsert with `{ upsert: true }` since document may not exist yet.

## Tenants Module (`src/modules/tenants/`)

**Endpoints implemented:**
- `POST /tenants` — creates tenant + seeds default `TenantSettings` (no RBAC guard yet — deferred to Phase 12B)
- `GET /tenants/current` — reads tenant via `user.tenantId` from JWT, joins with `TenantSettings`
- `PATCH /tenants/current` — updates `Tenant` doc fields
- `PATCH /tenants/current/settings` — upserts `TenantSettings`
- `GET /tenants/current/logo-upload-url` — delegates to `STORAGE_PROVIDER` for presigned URL

**Platform ObjectId:** `000000000000000000000000` is used as the `tenantId` on platform-global `Tenant` docs (since `BaseGlobalSchema` still inherits `tenantId` for index consistency).

**RBAC gap:** `POST /tenants` should be SUPER_ADMIN-only but the guard is not yet wired. Document this as tech debt for Phase 12B.

## Email Infrastructure (`src/shared/email/`)

**New class: `EmailTemplateService`** (injected anywhere via global `EmailModule`)
- `sendWelcome`, `sendVerification`, `sendPasswordReset`, `sendNotification`
- All swallow errors and log — email is non-fatal by design
- Wraps `IEmailProvider` via `EMAIL_PROVIDER` token

**Templates:** `templates/base.template.ts` → branded HTML shell. Individual template files return `{ subject, html, text }`. RTL-first (Arabic `dir="rtl"`).

**Auth module's `MailerService`** was left unchanged — it uses `IEmailProvider` directly with inline HTML. Migrate it to use `EmailTemplateService` in a future pass for consistency.

## Storage Layer (`src/shared/storage/`)

**Interface:** `STORAGE_PROVIDER` token → `IStorageProvider` with `upload`, `delete`, `getSignedUploadUrl`, `getSignedDownloadUrl`.

**Providers:**
- `S3StorageProvider` — AWS SDK v3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), works with R2 (set `endpoint` + `region=auto`)
- `NoopStorageProvider` — default when `STORAGE_DRIVER !== 's3'`, logs warnings, returns stub URLs

**Config:** `storage.*` keys in `configuration.ts` — `STORAGE_DRIVER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_PUBLIC_URL`.

**Global module** — `StorageModule` is `@Global`, imported in `AppModule`. No need to import in feature modules.

## Quran Foundation Seeder (`src/database/seeders/quran-foundation.seeder.ts`)

**Run:** `npm run seed:quran`

**Data source:** `https://api.alquran.cloud/v1/` — free, no auth, `quran-uthmani` edition.

**Collections seeded:** `surahs` (114), `ayahs` (6236), `juzs` (30), `quran_pages` (604).

**Idempotent:** skips a collection if it already has the expected count (114 / 6236 / 30).

**Normalization:** `normalizeArabic()` strips harakat (U+064B–U+065F, U+0670, extended), tatweel (U+0640), maps alef wasla (U+0671) → alef (U+0627). Applied to `arabicTextNormalized` at write time.

**Batch size:** 500 ayahs per insert to avoid Mongo 16MB limit.

**Seeder uses inline schemas** (not NestJS DI) — runs standalone via `ts-node`.

## Package additions (Phase 12A)
- `@aws-sdk/client-s3` — S3-compatible storage
- `@aws-sdk/s3-request-presigner` — presigned URL generation
