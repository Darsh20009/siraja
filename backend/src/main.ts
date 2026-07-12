import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Application bootstrap.
 * Global pipes/guards/filters are wired here as cross-cutting concerns;
 * business logic lives in feature modules.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(helmet());
  app.setGlobalPrefix(config.get<string>('apiPrefix', 'api/v1'));
  app.enableCors({ origin: config.get<string[]>('cors.origins', []) });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // API docs for Beta testers/integrators — not gated by auth (read-only
  // schema browsing), but never exposes real data since it only describes
  // routes/DTOs. Kept off in production to avoid advertising the full API
  // surface publicly; Beta runs with NODE_ENV=development/staging.
  if (config.get<string>('env') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Siraja API')
      .setDescription(
        'Siraja — Quran education & memorization platform. Every request against a tenant-scoped route must include the `X-Tenant-Slug` header.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', name: 'X-Tenant-Slug', in: 'header' }, 'tenant-slug')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('port', 3000);
  await app.listen(port);
  Logger.log(`Siraja API listening on port ${port} (env: ${config.get<string>('env')})`, 'Bootstrap');
}

bootstrap();
