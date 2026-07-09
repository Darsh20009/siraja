import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

/**
 * Application bootstrap.
 * Structure only — global pipes/guards/filters are wired here as
 * cross-cutting concerns; business logic lives in feature modules.
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

  const port = config.get<number>('port', 3000);
  await app.listen(port);
}

bootstrap();
