/**
 * Shared test app factory for E2E specs.
 *
 * Creates a full NestJS application wired to the in-memory MongoDB instance
 * started by setup.global.ts. Redis is not required — the app uses its
 * in-process CacheService fallback when REDIS_URL is absent.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { ConfigService } from '@nestjs/config';

let sharedApp: INestApplication | null = null;
let sharedModule: TestingModule | null = null;

export async function createTestApp(): Promise<INestApplication> {
  if (sharedApp) return sharedApp;

  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  sharedModule = moduleFixture;

  const app = moduleFixture.createNestApplication();
  const config = app.get(ConfigService);

  app.setGlobalPrefix(config.get<string>('apiPrefix', 'api/v1'));
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  sharedApp = app;
  return app;
}

export async function closeTestApp(): Promise<void> {
  if (sharedApp) {
    await sharedApp.close();
    sharedApp = null;
    sharedModule = null;
  }
}

export function getTestModule(): TestingModule {
  if (!sharedModule) throw new Error('Test app not initialised — call createTestApp() first.');
  return sharedModule;
}
