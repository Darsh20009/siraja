---
name: Siraja beta demo seeder and bootstrap flow
description: How to bootstrap the first tenant and demo users; the dbName gotcha in seed-beta-demo.ts.
---

## Bootstrap sequence
1. Ensure app is running (`nest start` on port 5000).
2. Run `npm run seed:quran` — seeds 114 surahs, 6,236 ayahs, 30 juz, 604 pages.
3. Run `npm run seed:permissions` — syncs 129 permissions to Atlas.
4. Run `npm run seed:beta-demo` — creates `siraja-demo` tenant + 4 demo users.
5. Run `npm run seed:super-admin` if it exists, or register via API with `role: super_admin`.

## Demo credentials (tenant `siraja-demo`, header `X-Tenant-Slug: siraja-demo`)
- `admin@siraja-demo.test` / BetaDemo123! — role: tenant_admin
- `sheikh@siraja-demo.test` / BetaDemo123! — role: sheikh
- `parent@siraja-demo.test` / BetaDemo123! — role: parent
- `student@siraja-demo.test` / BetaDemo123! — role: student
- Password: BetaDemo123!

## dbName gotcha — fixed 2026-07-18
`seed-beta-demo.ts` was using `mongoose.connect(uri)` without `{ dbName }`, inserting the tenant into the URI's default db path rather than the app's `siraja` db (from `MONGODB_DB_NAME`). Fix: `mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME || 'siraja' })`. Pattern already used correctly by `run-quran-seeder.ts`.

**Why:** The app always passes `dbName: process.env.MONGODB_DB_NAME` to `MongooseModule.forRootAsync`, so the app's database is `siraja` regardless of what the URI path says. Any standalone seeder that doesn't pass the same `dbName` writes to the wrong database.

## How to apply
Every standalone seeder (not using Nest's DI) must explicitly pass `{ dbName: process.env.MONGODB_DB_NAME || 'siraja' }` to `mongoose.connect()`.
