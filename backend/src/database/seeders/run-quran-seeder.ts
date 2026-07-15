/**
 * Entry point for the Quran foundation seeder.
 * Run: npm run seed:quran
 */

import mongoose from 'mongoose';
import { seedQuranFoundation } from './quran-foundation.seeder';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'siraja';

  if (!uri) {
    console.error('[QuranSeeder] MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  console.log(`[QuranSeeder] Connecting to MongoDB (db: ${dbName})...`);
  await mongoose.connect(uri, { dbName });
  console.log('[QuranSeeder] Connected.');

  try {
    await seedQuranFoundation(mongoose.connection);
  } finally {
    await mongoose.disconnect();
    console.log('[QuranSeeder] Disconnected.');
  }
}

main().catch((err) => {
  console.error('[QuranSeeder] Fatal error:', err);
  process.exit(1);
});
