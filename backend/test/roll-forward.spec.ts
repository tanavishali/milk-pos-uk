import { describe, expect, it } from 'vitest';
import { LedgerService } from '../src/modules/orders/ledger.service';
import { OrdersService } from '../src/modules/orders/orders.service';

/**
 * Closing a round book raises next week's bills: the same goods again for
 * every customer billed this week, each carrying what they still owe.
 *
 * These pin the parts a mistake would cost money on — the previous balance
 * printed on the new bill, and who gets billed at all.
 */

type Row = Record<string, unknown>;

function q<T>(value: T) {
  const chain = {
    sort: () => chain,
    select: () => chain,
    session: () => chain,
    lean: () => chain,
    then: (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

function bill(code: string, customerId: string, totalMinor: number, extra: Row = {}): Row {
  return {
    code,
    customerId,
    customer: { name: `Name ${customerId}`, phone: '0', address: 'old address', area: 'a', postcode: 'p', round: 'mon-thu' },
    courier: 'Bilal Khan',
    courierId: 'COUR-101',
    items: [{ productId: 'PROD-1', name: 'Milk 2L', qty: 2, priceMinor: totalMinor / 2 }],
    deliveryChargeMinor: 0,
    totalMinor,
    previousBalanceMinor: 0,
    grandTotalMinor: totalMinor,
    roundBook: 'RB-101',
    createdAt: new Date(2026, 8, 21),
    ...extra,
  };
}

function customer(id: string, round = 'mon-thu', paused = false) {
  return { id, name: `Name ${id}`, phone: '0', address: 'new address', area: 'a', postcode: 'p', round, paused };
}

function harness(opts: {
  thisWeek: Row[];
  olderBills?: Row[];
  paid?: Record<string, number>;
  customers: ReturnType<typeof customer>[];
  /** Everyone on the round; defaults to the customers billed this week. */
  onRound?: ReturnType<typeof customer>[];
  /** Earlier weeks' bills on this round, for customers returning from a pause. */
  earlierWeeks?: Row[];
}) {
  const inserted: Row[] = [];
  const stock: unknown[] = [];

  const orders = {
    find: (filter: Row) =>
      q(
        typeof filter.roundBook === 'string'
          ? opts.thisWeek
          : 'roundBook' in filter
            ? [...(opts.earlierWeeks ?? [])].sort(
                (a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime(),
              )
            : [...(opts.olderBills ?? []), ...(opts.earlierWeeks ?? []), ...opts.thisWeek],
      ),
    create: (docs: Row[]) => {
      inserted.push(...docs);
      return Promise.resolve(docs);
    },
  };

  let seq = 9000;
  const service = new OrdersService(
    orders as never,
    {} as never,
    { next: () => Promise.resolve(`TRX-${++seq}`) } as never,
    new LedgerService(),
    {
      paidTotalsByCustomer: () =>
        Promise.resolve(new Map(Object.entries(opts.paid ?? {}))),
    } as never,
    {
      findManyByCode: () =>
        Promise.resolve(new Map(opts.customers.map((c) => [c.id, c]))),
      findByRound: () =>
        Promise.resolve(
          opts.onRound ??
            opts.customers.filter((c) => opts.thisWeek.some((b) => b.customerId === c.id)),
        ),
    } as never,
    {} as never,
    { decrementStock: (lines: unknown) => (stock.push(lines), Promise.resolve()) } as never,
    {} as never,
    {} as never,
  );

  const run = (exclude: string[] = []) =>
    service.rollForward(
      { code: 'RB-101', roundId: 'mon-thu' },
      { code: 'RB-106', weekStart: '2026-09-28' },
      exclude,
      {} as never,
    );

  return { run, inserted, stock };
}

describe('OrdersService.rollForward', () => {
  it('copies each bill into next week’s book with the previous balance added', async () => {
    const { run, inserted, stock } = harness({
      thisWeek: [bill('TRX-1', 'A', 1000), bill('TRX-2', 'B', 500)],
      /** A still owes €4 from an older week and paid nothing this week. */
      olderBills: [bill('TRX-0', 'A', 400, { roundBook: 'RB-90' })],
      /** B paid this week's bill in full. */
      paid: { B: 500 },
      customers: [customer('A'), customer('B')],
    });

    const { created, skipped } = await run();

    expect(skipped).toEqual([]);
    expect(created.map((c) => [c.customerId, c.total, c.previousBalance, c.grandTotal])).toEqual([
      ['A', 10, 14, 24],
      ['B', 5, 0, 5],
    ]);

    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({
      roundBook: 'RB-106',
      customerId: 'A',
      courierId: 'COUR-101',
      totalMinor: 1000,
      previousBalanceMinor: 1400,
      grandTotalMinor: 2400,
    });
    /** The address is re-read, not copied off last week's bill. */
    expect((inserted[0] as { customer: { address: string } }).customer.address).toBe('new address');
    /** Stock is drawn down exactly as for a bill raised at the till. */
    expect(stock).toHaveLength(2);
  });

  it('carries the first new bill into the second for a customer billed twice a week', async () => {
    const { run } = harness({
      thisWeek: [bill('TRX-1', 'A', 600), bill('TRX-2', 'A', 400)],
      customers: [customer('A')],
    });

    const { created } = await run();

    /** Monday: owes this week's €10. Thursday: that plus next Monday's €6. */
    expect(created.map((c) => c.previousBalance)).toEqual([10, 16]);
  });

  it('prints no previous balance for a customer in credit', async () => {
    const { run } = harness({
      thisWeek: [bill('TRX-1', 'A', 500)],
      paid: { A: 800 },
      customers: [customer('A')],
    });

    const { created } = await run();
    expect(created[0]?.previousBalance).toBe(0);
    expect(created[0]?.grandTotal).toBe(5);
  });

  it('leaves out excluded, deleted and moved customers, once each', async () => {
    const { run, inserted } = harness({
      thisWeek: [
        bill('TRX-1', 'A', 100),
        bill('TRX-2', 'A', 100),
        bill('TRX-3', 'GONE', 100),
        bill('TRX-4', 'MOVED', 100),
        bill('TRX-5', 'KEEP', 100),
      ],
      customers: [customer('A'), customer('MOVED', 'wed-sat'), customer('KEEP')],
    });

    const { created, skipped } = await run(['A']);

    expect(created.map((c) => c.customerId)).toEqual(['KEEP']);
    expect(inserted).toHaveLength(1);
    expect(skipped).toEqual([
      { customerId: 'A', name: 'Name A', reason: 'Left out when the book was closed.' },
      { customerId: 'GONE', name: 'Name GONE', reason: 'Customer no longer exists.' },
      { customerId: 'MOVED', name: 'Name MOVED', reason: 'Now on Wed/Sat.' },
    ]);
  });

  it('raises no bill for a paused customer', async () => {
    const { run, inserted } = harness({
      thisWeek: [bill('TRX-1', 'A', 100), bill('TRX-2', 'B', 100)],
      customers: [customer('A', 'mon-thu', true), customer('B')],
    });

    const { created, skipped } = await run();

    expect(created.map((c) => c.customerId)).toEqual(['B']);
    expect(inserted).toHaveLength(1);
    expect(skipped).toEqual([{ customerId: 'A', name: 'Name A', reason: 'Paused.' }]);
  });

  it('brings a resumed customer back with their last week’s bills', async () => {
    const { run, inserted } = harness({
      thisWeek: [bill('TRX-5', 'A', 300)],
      earlierWeeks: [
        /** B's older week, then their latest week before the pause. */
        bill('TRX-1', 'B', 100, { roundBook: 'RB-90', createdAt: new Date(2026, 8, 7) }),
        bill('TRX-2', 'B', 250, { roundBook: 'RB-95', createdAt: new Date(2026, 8, 14) }),
        bill('TRX-3', 'B', 150, { roundBook: 'RB-95', createdAt: new Date(2026, 8, 17) }),
      ],
      customers: [customer('A'), customer('B'), customer('C', 'mon-thu', true)],
      onRound: [customer('A'), customer('B'), customer('C', 'mon-thu', true)],
    });

    const { created } = await run();

    /** A from this week; B from RB-95 (both bills, in order); C still paused. */
    expect(created.map((c) => [c.customerId, c.from])).toEqual([
      ['A', 'TRX-5'],
      ['B', 'TRX-2'],
      ['B', 'TRX-3'],
    ]);
    expect(inserted.every((row) => row.roundBook === 'RB-106')).toBe(true);
  });

  it('moves the delivery date on a week, or into the new week if the book was left open', async () => {
    const { run, inserted } = harness({
      thisWeek: [
        bill('TRX-1', 'A', 100, { deliveryDate: '2026-09-24' }),
        bill('TRX-2', 'B', 100, { deliveryDate: '2026-09-10' }),
        bill('TRX-3', 'C', 100),
      ],
      customers: [customer('A'), customer('B'), customer('C')],
    });

    await run();

    expect(inserted.map((row) => row.deliveryDate)).toEqual([
      '2026-10-01',
      '2026-10-01',
      undefined,
    ]);
  });

  it('does nothing for an empty book', async () => {
    const { run, inserted } = harness({ thisWeek: [], customers: [] });
    expect(await run()).toEqual({ created: [], skipped: [] });
    expect(inserted).toEqual([]);
  });
});
