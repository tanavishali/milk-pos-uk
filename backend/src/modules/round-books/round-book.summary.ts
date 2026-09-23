/**
 * The arithmetic behind a round book, with no database in sight.
 *
 * Kept pure for the same reason `LedgerService` is: the service fetches every
 * row it needs in a fixed number of bulk reads and hands them over, so the
 * sums can be tested with plain objects and can never quietly turn into a
 * query per customer.
 */

/** The fields a book's summary reads off a bill. */
export interface BookBill {
  code: string;
  customerId: string;
  customerName: string;
  courierId: string;
  deliveryDate?: string;
  totalMinor: number;
  createdAt: Date;
}

export interface BookSummary {
  orderCount: number;
  customerCount: number;
  billedMinor: number;
  settledMinor: number;
  outstandingMinor: number;
  carriedForwardMinor: number;
}

export interface BookStatement {
  customerId: string;
  name: string;
  orderCount: number;
  billedMinor: number;
  settledMinor: number;
  balanceMinor: number;
}

/**
 * Totals and one statement per customer for the bills in a book.
 *
 * @param bills     the bills stamped with this book, any order
 * @param covered   bill code to pence covered, from `LedgerService.allocate`
 *                  run over each customer's *whole* history — allocating over
 *                  this book's bills alone would let money meant for an older
 *                  debt settle this week's instead
 * @param balances  customer id to their whole-account balance in pence
 */
export function summarizeBook(
  bills: readonly BookBill[],
  covered: ReadonlyMap<string, number>,
  balances: ReadonlyMap<string, number>,
): { summary: BookSummary; statements: BookStatement[] } {
  const byCustomer = new Map<string, BookStatement & { latest: Date }>();

  let billedMinor = 0;
  let settledMinor = 0;

  for (const bill of bills) {
    /** Capped at the bill's own total — the allocation never exceeds it, but a
     *  summary must not report a bill as more than paid if it ever did. */
    const settled = Math.min(covered.get(bill.code) ?? 0, bill.totalMinor);

    billedMinor += bill.totalMinor;
    settledMinor += settled;

    const line = byCustomer.get(bill.customerId);
    if (!line) {
      byCustomer.set(bill.customerId, {
        customerId: bill.customerId,
        name: bill.customerName,
        orderCount: 1,
        billedMinor: bill.totalMinor,
        settledMinor: settled,
        balanceMinor: balances.get(bill.customerId) ?? 0,
        latest: bill.createdAt,
      });
      continue;
    }

    line.orderCount += 1;
    line.billedMinor += bill.totalMinor;
    line.settledMinor += settled;
    /** The name as most recently copied onto a bill, as the dashboard does. */
    if (bill.createdAt > line.latest) {
      line.name = bill.customerName;
      line.latest = bill.createdAt;
    }
  }

  const statements = [...byCustomer.values()]
    .map(({ latest: _latest, ...line }) => line)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    summary: {
      orderCount: bills.length,
      customerCount: statements.length,
      billedMinor,
      settledMinor,
      outstandingMinor: billedMinor - settledMinor,
      /** Credits are not netted against debts: one customer's credit does not
       *  reduce what another one owes. */
      carriedForwardMinor: statements.reduce(
        (sum, line) => sum + Math.max(0, line.balanceMinor),
        0,
      ),
    },
    statements,
  };
}

/**
 * Things the operator should look at before closing — never a reason the
 * server refuses to close.
 *
 * mymilkman blocks nothing either; its dialog is a checklist. The difference
 * here is that the checklist is worked out from the book instead of printed
 * as a reminder, so it only mentions what is actually wrong.
 */
export function closureWarnings(
  bills: readonly BookBill[],
  summary: BookSummary,
  weekEnd: string,
  formatMinor: (minor: number) => string,
): string[] {
  const warnings: string[] = [];

  if (bills.length === 0) {
    warnings.push('This book has no orders. Closing it only opens next week.');
    return warnings;
  }

  if (summary.outstandingMinor > 0) {
    warnings.push(
      `${formatMinor(summary.outstandingMinor)} of this week's bills is still unpaid. It stays on those customers' accounts and appears as the earlier balance on their next bill.`,
    );
  }

  const unassigned = bills.filter((bill) => !bill.courierId).length;
  if (unassigned > 0) {
    warnings.push(
      `${unassigned} order${unassigned === 1 ? ' has' : 's have'} no courier assigned.`,
    );
  }

  /** `YYYY-MM-DD` compares correctly as a string. */
  const late = bills.filter(
    (bill) => bill.deliveryDate && bill.deliveryDate > weekEnd,
  ).length;
  if (late > 0) {
    warnings.push(
      `${late} order${late === 1 ? ' is' : 's are'} scheduled for delivery after this week ends. ${late === 1 ? 'It stays' : 'They stay'} in this book.`,
    );
  }

  return warnings;
}

// ── Week arithmetic ─────────────────────────────────────────────────────────
//
// Dates are handled as `YYYY-MM-DD` strings built from local parts, the same
// way the rest of the backend and the frontend's `formatDateInput` do. Going
// through `toISOString()` would convert to UTC first and, east of Greenwich,
// hand back the wrong Monday late on a Sunday evening.

const pad = (n: number) => String(n).padStart(2, '0');

function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromYmd(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!);
}

/** The Monday of the week `date` falls in. Sunday belongs to the week before. */
export function mondayOf(date: Date): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return toYmd(copy);
}

export function addDays(ymd: string, days: number): string {
  const date = fromYmd(ymd);
  date.setDate(date.getDate() + days);
  return toYmd(date);
}

/**
 * The week the book after `previous` covers.
 *
 * Normally the following Monday. But a book left open for three weeks and
 * closed on the fourth must not open a new book dated three weeks ago, so the
 * next week is never earlier than the current one.
 */
export function nextWeekStart(previous: string | undefined, now: Date): string {
  const thisWeek = mondayOf(now);
  if (!previous) return thisWeek;
  const following = addDays(previous, 7);
  return following > thisWeek ? following : thisWeek;
}
