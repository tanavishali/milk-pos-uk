import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppThrottlerGuard } from './common/guards/throttler.guard';
import configuration, { type SecurityConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuditInterceptor } from './modules/audit/audit.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CouriersModule } from './modules/couriers/couriers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DeliveryModule } from './modules/delivery/delivery.module';
import { IdempotencyInterceptor } from './modules/idempotency/idempotency.interceptor';
import { IdempotencyModule } from './modules/idempotency/idempotency.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { RoundBooksModule } from './modules/round-books/round-books.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      validate: validateEnv,
      envFilePath: ['.env'],
    }),

    /**
     * Two named limiters rather than one.
     *
     * `default` is a generous ceiling that a till never reaches and a script
     * does immediately. `auth` is deliberately tiny and is applied only where
     * `@Throttle({ auth: … })` names it — sign-in is the endpoint a password
     * list is worked through, and it wants a limit measured in attempts per
     * quarter hour, not requests per minute.
     *
     * Storage is in-process. That is correct for a single instance and is the
     * thing to revisit first when a second one is added: two processes each
     * enforce their own half of the allowance, so the effective limit doubles.
     */
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const security = config.getOrThrow<SecurityConfig>('security');

        return {
          throttlers: [
            {
              name: 'default',
              ttl: security.rateLimitTtlMs,
              limit: security.rateLimitCount,
            },
            {
              name: 'auth',
              ttl: security.authRateLimitTtlMs,
              limit: security.authRateLimitCount,
            },
          ],
        };
      },
    }),

    DatabaseModule,
    AuditModule,
    IdempotencyModule,
    HealthModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    CouriersModule,
    DeliveryModule,
    OrdersModule,
    PaymentsModule,
    RoundBooksModule,
    DashboardModule,
  ],

  providers: [
    /**
     * Guards, applied to every route rather than route by route, in this
     * order — Nest runs global guards in registration order and each one
     * depends on the last having run.
     *
     * 1. **Throttler first.** It is the cheapest check and the only one that
     *    helps against a flood; putting it after authentication would mean
     *    every request in a flood cost a signature verification first.
     * 2. **`JwtAuthGuard`** resolves the token onto the request.
     * 3. **`RolesGuard`** reads the role off it. Reversed, the role check
     *    would run against a request that had no user yet.
     *
     * A route escapes the second with `@Public()` and narrows the third with
     * `@Roles()`. The point of putting them here is the default: an endpoint
     * added later is protected because nobody did anything to it.
     *
     * `JwtAuthGuard` needs `JwtService`, which `AuthModule` re-exports via
     * `JwtModule` — that is why it resolves from this module's injector.
     */
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    /**
     * Interceptors, outermost first.
     *
     * Idempotency wraps audit rather than the other way round: a replayed
     * request never reaches the handler, and the trail should say that the
     * write happened once, not once per tap. With the order reversed, every
     * retry would add a row describing a write that did not occur.
     *
     * `useExisting`, not `useClass`. `useClass` builds a *second* instance in
     * this module's injector, which then has to resolve the interceptor's own
     * dependencies here — and the Mongoose model tokens live in the feature
     * modules, not in this one. `useExisting` reuses the instance those modules
     * already built and export.
     */
    { provide: APP_INTERCEPTOR, useExisting: IdempotencyInterceptor },
    { provide: APP_INTERCEPTOR, useExisting: AuditInterceptor },

    /**
     * Registered here rather than with `useGlobalFilters(new …)` in `main.ts`,
     * because it now needs `AuditService` injected: guards run before
     * interceptors, so a write refused by `RolesGuard` never reaches
     * `AuditInterceptor`, and the filter is the only place that still sees it.
     */
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
