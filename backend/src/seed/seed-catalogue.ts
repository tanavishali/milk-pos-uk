import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { SequenceService } from '../database/sequence.service';
import { Category, type CategoryDocument } from '../modules/categories/schemas/category.schema';
import { Customer, type CustomerDocument } from '../modules/customers/schemas/customer.schema';
import { Product, type ProductDocument } from '../modules/products/schemas/product.schema';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './catalogue';
import { SEED_CUSTOMERS } from './customers';

/**
 * Loads the starting catalogue and customer directory.
 *
 * Idempotent, keyed on `code` and `name`, so re-running refreshes the seeded
 * rows without duplicating them or touching anything added since.
 *
 * Run with `npm run seed:catalogue`.
 */
async function seed(): Promise<void> {
  const logger = new Logger('SeedCatalogue');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const products = app.get<Model<ProductDocument>>(getModelToken(Product.name));
    const customers = app.get<Model<CustomerDocument>>(getModelToken(Customer.name));
    const categories = app.get<Model<CategoryDocument>>(getModelToken(Category.name));
    const sequence = app.get(SequenceService);

    await products.db.asPromise();

    for (const name of SEED_CATEGORIES) {
      await categories.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
    }
    logger.log(`${SEED_CATEGORIES.length} categories.`);

    for (const product of SEED_PRODUCTS) {
      await products.updateOne(
        { code: product.code },
        { $set: product },
        { upsert: true },
      );
    }
    logger.log(`${SEED_PRODUCTS.length} products.`);

    for (const customer of SEED_CUSTOMERS) {
      await customers.updateOne(
        { code: customer.code },
        { $set: customer },
        { upsert: true },
      );
    }
    logger.log(`${SEED_CUSTOMERS.length} customers.`);

    /**
     * The seed occupies PROD-101..120 and CUST-101..120, so each counter has to
     * start above its own range or the next create would collide with a
     * seeded id.
     */
    for (const [prefix, rows] of [
      ['PROD', SEED_PRODUCTS],
      ['CUST', SEED_CUSTOMERS],
    ] as const) {
      const highest = rows.reduce((max, row) => {
        const n = Number(row.code.split('-')[1]);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);

      await sequence.ensureAtLeast(prefix, highest);
      logger.log(`${prefix} counter at ${highest}; next id is ${prefix}-${highest + 1}.`);
    }
  } finally {
    await app.close();
  }
}

void seed();
