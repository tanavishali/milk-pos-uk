import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { setupSwagger } from './config/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  /** Nothing gains from advertising the server framework to every caller. */
  app.disable('x-powered-by');

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      /** Strip anything a DTO does not declare, rather than persisting it. */
      whitelist: true,
      /** Give handlers real DTO instances, with params coerced to their types. */
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: config.getOrThrow<string[]>('app.corsOrigin'),
    credentials: true,
  });

  /**
   * Lets Nest run module `onApplicationShutdown` hooks on SIGTERM — which is
   * what closes the Mongo connection cleanly instead of dropping it.
   */
  app.enableShutdownHooks();

  /** After the global prefix, so documented paths match real ones. */
  setupSwagger(app);

  const port = config.getOrThrow<number>('app.port');
  await app.listen(port);

  Logger.log(`Listening on http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`API reference at http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
