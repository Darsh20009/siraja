import mongoose from 'mongoose';
import { TenantSchema } from '@database/mongoose/schemas/tenant.schema';
import { UserSchema } from '@database/mongoose/schemas/user.schema';
import { UserStatus } from '@shared/enums/user-status.enum';
import { TenantStatus, TenantType } from '@shared/enums/tenant-status.enum';
import configuration from '@config/configuration';

/**
 * Beta seed script — creates one demo tenant plus one user per platform
 * role (Tenant Admin, Sheikh, Parent, Student), so testers/QA have a
 * known-good login for every role on day one without registering by
 * hand.
 *
 * Deliberately NOT a Nest application context (unlike a full
 * `AppModule` boot) — it only needs a Mongo connection to seed the
 * tenant, then drives the real, already-running HTTP API for user
 * creation so every seeded user goes through the exact same
 * `RegisterUseCase` path (password policy, Argon2id hashing, audit log)
 * that a real signup would.
 *
 * Usage:
 *   1. Ensure the server is running (this script calls its HTTP API).
 *   2. ts-node -r tsconfig-paths/register src/database/seeders/seed-beta-demo.ts
 *
 * Safe to re-run: skips users that already exist, upserts the tenant.
 */

const TENANT_SLUG = process.env.SEED_TENANT_SLUG || 'siraja-demo';
const TENANT_NAME = 'Siraja Demo Academy';
const API_BASE = process.env.SEED_API_BASE || `http://127.0.0.1:${configuration().port}${'/' + configuration().apiPrefix}`;
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD || 'BetaDemo123!';

const DEMO_USERS: Array<{ email: string; fullName: string; role: string }> = [
  { email: 'admin@siraja-demo.test', fullName: 'Demo Tenant Admin', role: 'tenant_admin' },
  { email: 'sheikh@siraja-demo.test', fullName: 'Demo Sheikh', role: 'sheikh' },
  { email: 'parent@siraja-demo.test', fullName: 'Demo Parent', role: 'parent' },
  { email: 'student@siraja-demo.test', fullName: 'Demo Student', role: 'student' },
];

async function upsertTenant(): Promise<string> {
  const Tenant = mongoose.model('Tenant', TenantSchema, 'tenants');
  const tenant = await Tenant.findOneAndUpdate(
    { slug: TENANT_SLUG },
    {
      $setOnInsert: {
        name: TENANT_NAME,
        slug: TENANT_SLUG,
        type: TenantType.ACADEMY,
        status: TenantStatus.ACTIVE,
      },
    },
    { upsert: true, new: true },
  );
  return (tenant!._id as mongoose.Types.ObjectId).toString();
}

async function registerDemoUser(user: { email: string; fullName: string; role: string }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Tenant-Slug': TENANT_SLUG },
    body: JSON.stringify({ email: user.email, password: DEMO_PASSWORD, fullName: user.fullName, role: user.role }),
  });
  if (res.status === 201) {
    console.log(`  created ${user.role.padEnd(12)} ${user.email}`);
    return;
  }
  const body: any = await res.json().catch(() => ({}));
  const innerMessage = typeof body.message === 'object' ? body.message?.message : body.message;
  if (res.status === 400 && String(innerMessage || '').includes('already exists')) {
    console.log(`  exists  ${user.role.padEnd(12)} ${user.email} (skipped)`);
    return;
  }
  throw new Error(`Failed to register ${user.email}: ${res.status} ${JSON.stringify(body)}`);
}

async function markDemoUsersVerifiedAndActive() {
  // Real signups require email verification before full access; demo
  // accounts skip that step so testers can log in immediately.
  const User = mongoose.model('User', UserSchema, 'users');
  const emails = DEMO_USERS.map((u) => u.email);
  await User.updateMany(
    { email: { $in: emails } },
    { $set: { isEmailVerified: true, status: UserStatus.ACTIVE } },
  );
}

async function bootstrap() {
  const uri = configuration().database.uri;
  if (!uri) throw new Error('MONGODB_URI is not set.');
  // Deliberately no explicit `dbName` override: the running app itself
  // connects via `MongooseModule.forRootAsync({ dbName: process.env.MONGODB_DB_NAME })`
  // in `app.module.ts`, which is `undefined` unless that env var is set —
  // so the app's real database is whatever db the URI's own path resolves
  // to, NOT `configuration().database.dbName`'s fallback default. Passing
  // that fallback here would silently seed a different, invisible database.
  await mongoose.connect(uri);

  console.log(`Seeding tenant "${TENANT_SLUG}"...`);
  await upsertTenant();

  console.log(`Registering demo users against ${API_BASE} ...`);
  for (const user of DEMO_USERS) {
    await registerDemoUser(user);
  }

  await markDemoUsersVerifiedAndActive();

  console.log('\nDone. Demo login credentials (send X-Tenant-Slug: ' + TENANT_SLUG + '):');
  for (const user of DEMO_USERS) {
    console.log(`  ${user.role.padEnd(12)} ${user.email} / ${DEMO_PASSWORD}`);
  }

  await mongoose.disconnect();
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Beta demo seeding failed:', error);
  process.exit(1);
});
