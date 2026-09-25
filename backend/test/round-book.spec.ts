import { describe, expect, it } from 'vitest';
import { LedgerService } from '../src/modules/orders/ledger.service';
import {
  addDays,
  closureWarnings,
  mondayOf,
  nextWeekStart,
  summarizeBook,
  type BookBill,
} from '../src/modules/round-books/round-book.summary';

/**
 * The round book's arithmetic.
 *
 * The property that matters most is that a book's "settled" figure comes from
 * the allocation over each customer's **whole** history. Allocating over the
 * book's own bills would let money a customer paid against last week's debt
 * settle this week's bill instead, and the closed statement would say this
 * week was paid when it was not.
 */

const eur = (minor: number) => `€${(minor / 100).toFixed(2)}`;

function bill(
  code: string,
  customerId: string,
  totalMinor: number,
  minute: number,
  extra: Partial<BookBill> = {},
): BookBill {
  return {
    code,
    customerId,
    customerName: `Customer ${customerId}`,
    courierId: 'COUR-101',
    totalMinor,
    createdAt: new Date(2026, 8, 21, 9, minute),
    ...extra,
  };
}

describe('summarizeBook', () => {
  it('totals the book and writes one statement per customer', () => {
    const bills = [
      bill('TRX-1', 'A', 748, 1),
      bill('TRX-2', 'B', 498, 2),
      bill('TRX-3', 'A', 1224, 3),
    ];

    const covered = new Map([
      ['TRX-1', 748],
      ['TRX-2', 0],
      ['TRX-3', 500],
    ]);
    const balances = new Map([
      ['A', 724],
      ['B', 498],
    ]);

    const { summary, statements } = summarizeBook(bills, covered, balances);

    expect(summary).toEqual({
      orderCount: 3,
      customerCount: 2,
      billedMinor: 2470,
      settledMinor: 1248,
      outstandingMinor: 1222,
      carriedForwardMinor: 1222,
    });

    expect(statements).toEqual([
      {
        customerId: 'A',
        name: 'Customer A',
        orderCount: 2,
        billedMinor: 1972,
        settledMinor: 1248,
        balanceMinor: 724,
      },
      {
        customerId: 'B',
        name: 'Customer B',
        orderCount: 1,
        billedMinor: 498,
        settledMinor: 0,
        balanceMinor: 498,
      },
    ]);
  });

  it('carries forward older debt as well as this week’s, and ignores credits', () => {
    const bills = [bill('TRX-9', 'A', 1000, 1), bill('TRX-10', 'B', 1000, 2)];
    const covered = new Map([
      ['TRX-9', 1000],
      ['TRX-10', 1000],
    ]);

    /** A still owes €5 from an older book; B is €3 in credit. */
    const balances = new Map([
      ['A', 500],
      ['B', -300],
    ]);

    const { summary, statements } = summarizeBook(bills, covered, balances);

    expect(summary.outstandingMinor).toBe(0);
    expect(summary.carriedForwardMinor).toBe(500);
    /** Kept signed on the statement: a credit is not the same as zero. */
    expect(statements.find((s) => s.customerId === 'B')?.balanceMinor).toBe(-300);
  });

  it('uses the whole-history allocation, so old debt is paid before this week', () => {
    const ledger = new LedgerService();

    /** Last week's €10 bill, in an older book, and this week's €10 bill. */
    const history = [
      { code: 'TRX-OLD', totalMinor: 1000, createdAt: new Date(2026, 8, 14) },
      { code: 'TRX-NEW', totalMinor: 1000, createdAt: new Date(2026, 8, 21) },
    ];

    /** €10 handed over at the door, no bill named. */
    const payments = [
      { amountMinor: 1000, appliesTo: undefined, createdAt: new Date(2026, 8, 22) },
    ];

    const covered = ledger.allocate(payments, history as never);
    const balance = ledger.balanceMinor(history as never, 1000);

    const { summary } = summarizeBook(
      [bill('TRX-NEW', 'A', 1000, 1)],
      covered,
      new Map([['A', balance]]),
    );

    /** The money cleared last week's bill; this week's is still open. */
    expect(summary.settledMinor).toBe(0);
    expect(summary.outstandingMinor).toBe(1000);
    expect(summary.carriedForwardMinor).toBe(1000);
  });

  it('names the customer as on their latest bill in the book', () => {
    const { statements } = summarizeBook(
      [
        bill('TRX-1', 'A', 100, 5, { customerName: 'Una Ivanova' }),
        bill('TRX-2', 'A', 100, 1, { customerName: 'Una Ivanov' }),
      ],
      new Map(),
      new Map(),
    );

    expect(statements[0]?.name).toBe('Una Ivanova');
  });

  it('summarises an empty book as zeros', () => {
    const { summary, statements } = summarizeBook([], new Map(), new Map());
    expect(summary.orderCount).toBe(0);
    expect(summary.billedMinor).toBe(0);
    expect(statements).toEqual([]);
  });
});

describe('closureWarnings', () => {
  const weekEnd = '2026-09-27';

  it('says an empty book only opens next week', () => {
    const { summary } = summarizeBook([], new Map(), new Map());
    expect(closureWarnings([], summary, weekEnd, eur)).toEqual([
      'This book has no orders. Closing it only opens next week.',
    ]);
  });

  it('reports unpaid money, unassigned couriers and late deliveries', () => {
    const bills = [
      bill('TRX-1', 'A', 1000, 1, { courierId: '' }),
      bill('TRX-2', 'B', 500, 2, { deliveryDate: '2026-09-28' }),
    ];
    const { summary } = summarizeBook(
      bills,
      new Map([['TRX-1', 1000]]),
      new Map([['B', 500]]),
    );

    const warnings = closureWarnings(bills, summary, weekEnd, eur);

    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toContain('€5.00');
    expect(warnings[1]).toBe('1 order has no courier assigned.');
    expect(warnings[2]).toContain('after this week ends');
  });

  it('says nothing about a fully paid, fully assigned week', () => {
    const bills = [bill('TRX-1', 'A', 1000, 1, { deliveryDate: '2026-09-24' })];
    const { summary } = summarizeBook(bills, new Map([['TRX-1', 1000]]), new Map());
    expect(closureWarnings(bills, summary, weekEnd, eur)).toEqual([]);
  });
});

describe('week arithmetic', () => {
  it('finds the Monday of the week, with Sunday belonging to the week before', () => {
    expect(mondayOf(new Date(2026, 8, 21))).toBe('2026-09-21'); // Monday
    expect(mondayOf(new Date(2026, 8, 23, 21))).toBe('2026-09-21'); // Wednesday
    expect(mondayOf(new Date(2026, 8, 27, 23, 59))).toBe('2026-09-21'); // Sunday
  });

  it('adds days across a month end', () => {
    expect(addDays('2026-09-28', 6)).toBe('2026-10-04');
  });

  it('opens the following Monday after a book closed on time', () => {
    expect(nextWeekStart('2026-09-21', new Date(2026, 8, 27, 20))).toBe('2026-09-28');
  });

  it('never opens a week in the past after a book was left open', () => {
    /** The 7 Sep book, closed on Wednesday 23 Sep. */
    expect(nextWeekStart('2026-09-07', new Date(2026, 8, 23))).toBe('2026-09-21');
  });

  it('starts a round with no history in the current week', () => {
    expect(nextWeekStart(undefined, new Date(2026, 8, 23))).toBe('2026-09-21');
  });
});
