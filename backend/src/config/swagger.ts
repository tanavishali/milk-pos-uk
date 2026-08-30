import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Interactive API reference at `/api/docs`, raw OpenAPI JSON at
 * `/api/docs-json`.
 *
 * Mounted for every environment for now — this is the contract the frontend is
 * being ported onto, so it needs to be readable from wherever the API is
 * running. Gate it on `NODE_ENV` once the API is public.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('BLANKSYS POS API')
    .setDescription(
      [
        'Backend for the BLANKSYS POS terminal — a credit delivery round.',
        '',
        'Two notes that explain most of the shapes here:',
        '',
        '- **Money is integer minor units (pence).** `3449` means £34.49.',
        '  Never a float; see `src/common/utils/money.ts` for why.',
        '- **Payment status is derived, never stored.** A bill is Unpaid on',
        '  Monday and Paid on Saturday with nothing about the bill changing.',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Sign in, registration and the current session')
    .addTag('products', 'Master items: catalogue, pricing and stock')
    .addTag('categories', 'Catalogue categories, keyed by name')
    .addTag('customers', 'The delivery-round customer directory')
    .addTag('couriers', 'The dispatch roster, and the sign-in account behind each driver')
    .addTag('delivery', 'Rounds and weekdays — read-only reference data')
    .addTag('orders', 'Bills raised on the round, with ledger-derived payment state')
    .addTag('payments', 'The payment ledger: money in, per customer')
    .addTag('dashboard', 'Headline figures and the activity log')
    .addTag('health', 'Liveness and database connectivity')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    /** Swagger ignores `setGlobalPrefix` unless told to honour it. */
    useGlobalPrefix: true,
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      /** Keeps a pasted bearer token across a page reload while testing. */
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'BLANKSYS POS API',
  });
}
