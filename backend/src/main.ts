import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import type { SecurityConfig } from './config/configuration';
import { setupSwagger } from './config/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    /** Set from configuration a few lines down; the default would be 100kb. */
    bodyParser: true,
  });

  const config = app.get(ConfigService);
  const security = config.getOrThrow<SecurityConfig>('security');

  /** Nothing gains from advertising the server framework to every caller. */
  app.disable('x-powered-by');

  /**
   * How far to trust `X-Forwarded-For`.
   *
   * This is what makes `req.ip` mean anything, and the rate limiter keys
   * unauthenticated callers on `req.ip`. Left at the default behind a proxy,
   * every request reports the proxy's address and the whole internet shares
   * one allowance; set too high, a caller can prepend addresses to the header
   * and mint a fresh allowance per request. So it is the real hop count, from
   * configuration, rather than a blanket `true`.
   */
  app.set('trust proxy', security.trustProxyHops);

  /**
   * Standard security headers.
   *
   * `contentSecurityPolicy` is off because this process serves a JSON API and
   * one HTML page — Swagger — whose inline scripts a default CSP blocks
   * outright. A CSP that has to be disabled per-page to keep the docs working
   * is a CSP nobody maintains; the browser-facing surface is the frontend, and
   * that is where a real policy belongs.
   *
   * `crossOriginResourcePolicy` is relaxed for the same reason: the API is
   * called cross-origin by design, which is what CORS is configured for below.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  /**
   * gzip on the way out. A page of decorated orders is mostly repeated field
   * names and is roughly a tenth of the size compressed, which is the
   * difference that matters on a driver's phone on a slow connection.
   */
  app.use(compression());

  /**
   * A hundred-line order is a few kilobytes; this is a bound on what an
   * attacker can make the process parse, not a limit any real client meets.
   */
  app.useBodyParser('json', { limit: security.bodyLimit });
  app.useBodyParser('urlencoded', { limit: security.bodyLimit, extended: true });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      /** Strip anything a DTO does not declare, rather than persisting it. */
      whitelist: true,
      /** Give handlers real DTO instances, with params coerced to their types. */
      transform: true,
    }),
  );

  app.enableCors({
    origin: config.getOrThrow<string[]>('app.corsOrigin'),
    credentials: true,
    /**
     * Named explicitly because the browser will not send `Idempotency-Key` on
     * a cross-origin request unless the preflight allows it — and a header the
     * browser silently drops turns the retry protection into a no-op that
     * looks like it is working.
     */
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
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
