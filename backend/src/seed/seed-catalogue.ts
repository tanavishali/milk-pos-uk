import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { AppModule } from '../app.module';
import { SequenceService } from '../database/sequence.service';
import { Category, type CategoryDocument } from '../modules/categories/schemas/category.schema';
import { Courier, type CourierDocument } from '../modules/couriers/schemas/courier.schema';
import { Customer, type CustomerDocument } from '../modules/customers/schemas/customer.schema';
import { Order, type OrderDocument } from '../modules/orders/schemas/order.schema';
import { Payment, type PaymentDocument } from '../modules/payments/schemas/payment.schema';
import { Product, type ProductDocument } from '../modules/products/schemas/product.schema';
import { SEED_CATEGORIES, SEED_PRODUCTS } from './catalogue';
import { SEED_COURIERS } from './couriers';
import { SEED_CUSTOMERS } from './customers';
import { SEED_ORDERS, SEED_PAYMENTS } from './ledger';

/**
 * Loads the starting catalogue, customer directory, dispatch roster and the
 * seeded round of orders and payments.
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
    const orders = app.get<Model<OrderDocument>>(getModelToken(Order.name));
    const payments = app.get<Model<PaymentDocument>>(getModelToken(Payment.name));
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
     * `YYYY-MM-DD HH:mm` to a Date. The ledger sorts bills oldest-first on
     * `createdAt`, so a seeded round has to carry the timestamps of the days it
     * describes — seeding them all at "now" would collapse three weeks of
     * deliveries into one instant and leave the ordering to chance.
     */
    const stampOf = (date: string) => new Date(date.replace(' ', 'T'));

    written = 0;
    for (const order of SEED_ORDERS) {
      const result = await orders.updateOne(
        { code: order.code },
        { $set: { ...order, createdAt: stampOf(order.date) } },
        { upsert: true, timestamps: false },
      );
      if (result.acknowledged) written += 1;
    }
    logger.log(`${written}/${SEED_ORDERS.length} orders.`);

    written = 0;
    for (const payment of SEED_PAYMENTS) {
      const result = await payments.updateOne(
        { code: payment.code },
        { $set: { ...payment, createdAt: stampOf(payment.date) } },
        { upsert: true, timestamps: false },
      );
      if (result.acknowledged) written += 1;
    }
    logger.log(`${written}/${SEED_PAYMENTS.length} payments.`);

    /**
     * Every counter has to start above its own seeded range or the next create
     * would collide with a seeded id. The ranges differ — orders run from 8901,
     * everything else from 101 — which is why each is derived from its own rows
     * rather than from a shared constant.
     */
    for (const [prefix, rows] of [
      ['PROD', SEED_PRODUCTS],
      ['CUST', SEED_CUSTOMERS],
      ['COUR', SEED_COURIERS],
      ['TRX', SEED_ORDERS],
      ['PAY', SEED_PAYMENTS],
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
