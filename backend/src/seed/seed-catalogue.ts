import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { SequenceService } from '../database/sequence.service';
import { Category, type CategoryDocument } from '../modules/categories/schemas/category.schema';
import { Courier, type CourierDocument } from '../modules/couriers/schemas/courier.schema';
import { Customer, type CustomerDocument } from '../modules/customers/schemas/customer.schema';
import { Product, type ProductDocument } from '../modules/products/schemas/product.schema';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './catalogue';
import { SEED_COURIERS } from './couriers';
import { SEED_CUSTOMERS } from './customers';

/**
 * Loads the starting catalogue, customer directory and dispatch roster.
 *
 * Idempotent, keyed on `code` and `name`, so re-running refreshes the seeded
 * rows without duplicating them or touching anything added since.
 *
 * Counts are taken from what the database acknowledged, not from the length of
 * the array being written. An earlier version logged the array length, and
 * reported "20 couriers" for a run that a dropped connection had cut short at
 * fifteen — a seed that lies about what it wrote is worse than one that fails.
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
    const couriers = app.get<Model<CourierDocument>>(getModelToken(Courier.name));
    const categories = app.get<Model<CategoryDocument>>(getModelToken(Category.name));
    const sequence = app.get(SequenceService);

    await products.db.asPromise();

    let written = 0;
    for (const name of SEED_CATEGORIES) {
      const result = await categories.updateOne(
        { name },
        { $setOnInsert: { name } },
        { upsert: true },
      );
      if (result.acknowledged) written += 1;
    }
    logger.log(`${written}/${SEED_CATEGORIES.length} categories.`);

    written = 0;
    for (const product of SEED_PRODUCTS) {
      const result = await products.updateOne(
        { code: product.code },
        { $set: product },
        { upsert: true },
      );
      if (result.acknowledged) written += 1;
    }
    logger.log(`${written}/${SEED_PRODUCTS.length} products.`);

    written = 0;
    for (const customer of SEED_CUSTOMERS) {
      const result = await customers.updateOne(
        { code: customer.code },
        { $set: customer },
        { upsert: true },
      );
      if (result.acknowledged) written += 1;
    }
    logger.log(`${written}/${SEED_CUSTOMERS.length} customers.`);

    written = 0;
    for (const courier of SEED_COURIERS) {
      const result = await couriers.updateOne(
        { code: courier.code },
        { $set: courier },
        { upsert: true },
      );
      if (result.acknowledged) written += 1;
    }
    logger.log(`${written}/${SEED_COURIERS.length} couriers.`);

    /**
     * Each seed occupies its own 101..120 range, so every counter has to start
     * above it or the next create would collide with a seeded id.
     */
    for (const [prefix, rows] of [
      ['PROD', SEED_PRODUCTS],
      ['CUST', SEED_CUSTOMERS],
      ['COUR', SEED_COURIERS],
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
