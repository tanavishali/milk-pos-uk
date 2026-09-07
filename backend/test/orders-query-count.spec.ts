import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { LedgerService } from '../src/modules/orders/ledger.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import type { OrderDocument } from '../src/modules/orders/schemas/order.schema';
import type { PaymentsService } from '../src/modules/payments/payments.service';

/**
 * How many round trips a page of orders costs.
 *
 * `decorate` used to loop over the customers on the page and fetch each one's
 * payments in turn — two queries per customer, awaited one after another. The
 * per-customer *arithmetic* was already memoised, which is what made it easy to
 * miss: the loop looked like a cache and behaved like an N+1. A page covering
 * two hundred customers cost four hundred serial round trips before a byte went
 * back, so the endpoint got slower in proportion to how well the business was
 * doing.
 *
 * The rule these tests pin is that **the query count does not depend on how
 * many customers are on the page.** That is a property no assertion about
 * response shape would catch, and it is exactly the property that regressed
 * the first time, so it is asserted directly: the model is a counting stub, and
 * the same page is decorated at one customer and at fifty.
 */

/** A `find()` chain that records the call and resolves to fixed rows. */
function query<T>(rows: T[]) {
  const chain = {
    select: () => chain,
    sort: () => chain,
    skip: () => chain,
    limit: () => chain,
    lean: () => chain,
    exec: () => Promise.resolve(rows),
    then: (resolve: (value: T[]) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

/** One bill, with only the fields the ledger and the DTO actually read. */
function bill(customerId: string, index: number): OrderDocument {
  return {
    code: `TRX-${index}`,
    customerId,
    date: '2026-09-01 10:00',
    customer: {
      name: `Customer ${customerId}`,
      phone: '000',
      address: 'somewhere',
      area: 'an area',
      postcode: 'X1 1XX',
      round: '',
    },
    courier: 'Unassigned',
    courierId: '',
    items: [],
    deliveryChargeMinor: 0,
    totalMinor: 1000,
    previousBalanceMinor: 0,
    grandTotalMinor: 1000,
    createdAt: new Date(2026, 8, 1, 0, index),
  } as unknown as OrderDocument;
}

/** Counts every call the service makes, and reports them by name. */
function harness(customerCount: number, billsEach = 3) {
  const calls: string[] = [];

  const rows = Array.from({ length: customerCount }, (_, c) =>
    Array.from({ length: billsEach }, (_, b) => bill(`CUST-${c}`, c * 10 + b)),
  ).flat();

  const orders = {
    find: () => {
      calls.push('orders.find');
      return query(rows);
    },
    estimatedDocumentCount: () => {
      calls.push('orders.estimatedDocumentCount');
      return Promise.resolve(rows.length);
    },
    countDocuments: () => {
      calls.push('orders.countDocuments');
      return Promise.resolve(rows.length);
    },
    aggregate: () => {
      calls.push('orders.aggregate');
      return Promise.resolve([]);
    },
  };

  const payments = {
    ledgerRowsForMany: (ids: string[]) => {
      calls.push('payments.ledgerRowsForMany');
      return Promise.resolve(new Map(ids.map((id) => [id, []])));
    },
    paidTotalsByCustomer: () => {
      calls.push('payments.paidTotalsByCustomer');
      return Promise.resolve(new Map<string, number>());
    },
    receivedAtDeliveryMinor: () => {
      calls.push('payments.receivedAtDeliveryMinor');
      return Promise.resolve(new Map<string, number>());
    },
  } as unknown as PaymentsService;

  /** Big enough that the whole fixture fits one page, so paging is not what varies. */
  const config = {
    getOrThrow: () => ({ defaultLimit: 500, maxLimit: 500 }),
  } as unknown as ConfigService;

  const service = new OrdersService(
    orders as never,
    {} as never,
    {} as never,
    new LedgerService(),
    payments,
    {} as never,
    {} as never,
    {} as never,
    config,
  );

  return { service, calls, rows };
}

describe('GET /orders query count', () => {
  it('costs the same number of round trips at 1 customer and at 50', async () => {
    const one = harness(1);
    const fifty = harness(50);

    await one.service.list();
    await fifty.service.list();

    expect(fifty.calls.length).toBe(one.calls.length);
  });

  it('issues the page, its count, and four bulk reads — nothing per customer', async () => {
    const { service, calls } = harness(50);

    await service.list();

    expect(calls).toEqual([
      // The page itself, and how many rows there are in total.
      'orders.find',
      'orders.estimatedDocumentCount',
      // Then four bulk reads, all concurrent, none of them per customer.
      'orders.find',
      'payments.ledgerRowsForMany',
      'payments.paidTotalsByCustomer',
      'payments.receivedAtDeliveryMinor',
    ]);
  });

  it('still decorates every row on the page', async () => {
    const { service, rows } = harness(50);

    const page = await service.list();

    expect(page.items).toHaveLength(rows.length);
    // Unpaid, since the stub reports no payments at all — the point here is
    // that a row-per-order came back, not what its status is.
    expect(page.items.every((order) => order.status === 'Unpaid')).toBe(true);
  });

  it('reports the paging metadata alongside the rows', async () => {
    const { service, rows } = harness(50);

    const { meta } = await service.list();

    expect(meta).toEqual({
      page: 1,
      limit: 500,
      total: rows.length,
      pages: 1,
      hasMore: false,
    });
  });

  it('reads no payment data at all for an empty page', async () => {
    const { service, calls } = harness(0);

    const page = await service.list();

    expect(page.items).toEqual([]);
    // The page and its count still happen; the four bulk reads are skipped,
    // because there is no customer to fetch anything for.
    expect(calls).toEqual(['orders.find', 'orders.estimatedDocumentCount']);
  });
});
