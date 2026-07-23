import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export default async function globalSetup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.MONGODB_DB_NAME = 'siraja_test';
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-32chars-minimum';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32chars-minimum';
  process.env.JWT_ACCESS_EXPIRES_IN = '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  process.env.PORT = '0';
  // Redis is optional — leave REDIS_URL unset so the app uses in-process fallback
  delete process.env.REDIS_URL;
  // Disable email delivery in tests
  delete process.env.EMAIL_HOST;

  // Expose mongod on global so teardown can stop it
  (global as Record<string, unknown>).__MONGOD__ = mongod;
}
