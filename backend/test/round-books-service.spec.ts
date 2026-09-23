import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { RoundBookStatus } from '../src/common/enums';
import { LedgerService } from '../src/modules/orders/ledger.service';
import { RoundBooksService } from '../src/modules/round-books/round-books.service';

/**
 * The round book service against in-memory stubs.
 *
 * These pin the two guards that keep a round consistent: a bill raised inside
 * a transaction *writes* the open book (so it collides with a concurrent
 * close), and closing a book that is already closed is refused rather than
 * opening a second next week.
 */

type Row = Record<string, unknown>;

/** A chainable query that resolves to `value`. */
function q<T>(value: T) {
  const chain = {
    sort: () => chain,
    select: () => chain,
    limit: () => chain,
    session: () => chain,
    lean: () => chain,
    then: (resolve: (v: T) => unknown, reject?: (e: unknown) => unknown) =>
      Promise.resolve(value).then(resolve, reject),
  };
  return chain;
}

function harness(initialBooks: Row[] = [], orders: Row[] = []) {
  const books = [...initialBooks];
  const calls: string[] = [];

  const matches = (row: Row, filter: Row) =>
    Object.entries(filter).every(([k, v]) => row[k] === v);

  const bookModel = {
    findOne: (filter: Row) => {
      calls.push('books.findOne');
      return q(books.find((b) => matches(b, filter)) ?? null);
    },
    find: (filter: Row) => q(books.filter((b) => matches(b, filter))),
    findOneAndUpdate: (filter: Row, update: { $set?: Row; $inc?: Row }) => {
      calls.push('books.findOneAndUpdate');
      const book = books.find((b) => matches(b, filter));
      if (book) {
        Object.assign(book, update.$set ?? {});
        for (const [k, v] of Object.entries(update.$inc ?? {})) {
          book[k] = ((book[k] as number) ?? 0) + (v as number);
        }
      }
      return q(book ?? null);
    },
    create: (docs: Row[]) => {
      calls.push('books.create');
      const created = docs.map((d) => ({ revision: 0, createdAt: new Date(), ...d }));
      books.push(...created);
      return Promise.resolve(created.map((d) => ({ ...d, toObject: () => d })));
    },
  };

  const orderModel = {
    find: (filter: Row) =>
      q(
        orders.filter((o) =>
          'roundBook' in filter
            ? o.roundBook === filter.roundBook
            : (filter.customerId as { $in: string[] }).$in.includes(o.customerId as string),
        ),
      ),
    updateMany: () => {
      calls.push('orders.updateMany');
      return Promise.resolve({ modifiedCount: 0 });
    },
  };

  let seq = 100;
  const sequence = { next: (p: string) => Promise.resolve(`${p}-${++seq}`) };

  const payments = {
    ledgerRowsForMany: () => Promise.resolve(new Map()),
    paidTotalsByCustomer: () => Promise.resolve(new Map()),
  };

  /** A session whose transaction simply runs the callback once. */
  const connection = {
    startSession: () =>
      Promise.resolve({
        withTransaction: (fn: () => Promise<void>) => fn(),
        endSession: () => Promise.resolve(),
      }),
  };

  const service = new RoundBooksService(
    bookModel as never,
    orderModel as never,
    connection as never,
    sequence as never,
    payments as never,
    new LedgerService(),
  );

  return { service, books, calls };
}

const openBook = {
  code: 'RB-50',
  roundId: 'mon-thu',
  roundLabel: 'Mon/Thurs',
  weekStart: '2026-09-21',
  status: RoundBookStatus.Open,
  revision: 3,
};

describe('RoundBooksService.openBook', () => {
  it('returns null for a walk-in or an unknown round', async () => {
    const { service } = harness();
    expect(await service.openBook('')).toBeNull();
    expect(await service.openBook('not-a-round')).toBeNull();
  });

  it('writes the open book when called inside a transaction', async () => {
    const { service, books, calls } = harness([{ ...openBook }]);

    const book = await service.openBook('mon-thu', {} as never);

    expect(book?.code).toBe('RB-50');
    expect(calls).toEqual(['books.findOneAndUpdate']);
    expect(books[0]?.revision).toBe(4);
  });

  it('opens the round’s first book and claims the bills raised before books existed', async () => {
    const { service, books, calls } = harness();

    const book = await service.openBook('mon-thu');

    expect(book?.status).toBe(RoundBookStatus.Open);
    expect(book?.roundLabel).toBe('Mon/Thurs');
    expect(books).toHaveLength(1);
    expect(calls).toContain('orders.updateMany');
  });

  it('does not claim older bills when opening a later week', async () => {
    const { service, calls } = harness([
      { ...openBook, status: RoundBookStatus.Closed },
    ]);

    const book = await service.openBook('mon-thu');

    expect(book!.weekStart > '2026-09-21').toBe(true);
    expect(calls).not.toContain('orders.updateMany');
  });
});

describe('RoundBooksService.close', () => {
  it('freezes the book, and opens the next week for the same round', async () => {
    const { service, books } = harness(
      [{ ...openBook }],
      [
        {
          code: 'TRX-1',
          customerId: 'CUST-1',
          customer: { name: 'Una' },
          courierId: 'COUR-1',
          totalMinor: 748,
          createdAt: new Date(2026, 8, 21),
          roundBook: 'RB-50',
        },
      ],
    );

    const { closed, next } = await service.close('RB-50', 'ada@blanksys.pos');

    expect(closed.status).toBe(RoundBookStatus.Closed);
    expect(closed.closedBy).toBe('ada@blanksys.pos');
    expect(closed.summary.billed).toBe(7.48);
    expect(closed.summary.outstanding).toBe(7.48);
    expect(closed.statements).toHaveLength(1);

    expect(next.status).toBe(RoundBookStatus.Open);
    expect(next.roundId).toBe('mon-thu');
    expect(next.weekStart >= '2026-09-28').toBe(true);

    expect(books.filter((b) => b.status === RoundBookStatus.Open)).toHaveLength(1);
  });

  it('raises next week’s bills in the new book, inside the closing transaction', async () => {
    const { service } = harness([{ ...openBook }]);
    const seen: { closed?: string; next?: string; session?: unknown } = {};

    const result = await service.close('RB-50', 'ada@blanksys.pos', (closed, next, session) => {
      seen.closed = closed.code;
      seen.next = next.code;
      seen.session = session;
      return Promise.resolve({
        created: [
          { id: 'TRX-9', from: 'TRX-1', customerId: 'CUST-1', customerName: 'Una', total: 7.48, previousBalance: 0, grandTotal: 7.48 },
        ],
        skipped: [],
      });
    });

    expect(seen.closed).toBe('RB-50');
    expect(seen.next).toBe(result.next.id);
    expect(seen.session).toBeDefined();
    expect(result.rolledForward.created).toHaveLength(1);
  });

  it('fails the whole close when next week’s bills cannot be raised', async () => {
    const { service } = harness([{ ...openBook }]);
    await expect(
      service.close('RB-50', 'ada@blanksys.pos', () => Promise.reject(new Error('stock write failed'))),
    ).rejects.toThrow('stock write failed');
  });

  it('refuses to close a book twice', async () => {
    const { service, books } = harness([
      { ...openBook, status: RoundBookStatus.Closed },
    ]);

    await expect(service.close('RB-50', 'ada@blanksys.pos')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(books).toHaveLength(1);
  });
});
