import { Injectable } from '@nestjs/common';
import { PaymentStatus } from '../../common/enums';
import type { PaymentDocument } from '../payments/schemas/payment.schema';
import type { OrderDocument } from './schemas/order.schema';

/** The fields the allocation actually reads off a bill. */
export type LedgerBill = Pick<OrderDocument, 'code' | 'totalMinor' | 'createdAt'>;

/** The fields the allocation actually reads off a payment. */
export type LedgerPayment = Pick<
  PaymentDocument,
  'amountMinor' | 'appliesTo' | 'createdAt'
>;

/**
 * The money model.
 *
 * Everything here is integer pence. The mock had to call `round2()` after every
 * addition because `24.5 + 9.99` is `34.489999999999995` in floating point —
 * invisible in a formatted figure, but it decides whether a bill reads Paid or
 * Part Paid against `34.49`. Integers remove the problem rather than rounding
 * it away repeatedly, which is what makes `settled >= total` an exact test.
 *
 * Nothing here is stored. The same bill is Unpaid on Monday and Paid on
 * Saturday without anything about the bill changing, and a stored copy would be
 * a second truth waiting to drift — plus a migration every time cash landed.
 *
 * **Nothing here touches the database either.** Every method is a pure function
 * over rows the caller has already fetched. That is deliberate: the allocation
 * is per customer, so a service that fetched its own payments would issue one
 * query per customer in any list — the N+1 this class used to be the source
 * of. Handing it the rows lets `OrdersService` load a whole page’s worth in a
 * single query, and makes the arithmetic testable with no stub at all.
 */
@Injectable()
export class LedgerService {
  /**
   * Spread what a customer has paid across their bills, oldest first.
   *
   * Two rules, in this order:
   *
   * 1. **A payment that names a bill goes to that bill.** That is the operator
   *    saying "this week is paid, last week is not". Applying it oldest-first
   *    anyway would settle last week's debt and leave this week's open — the
   *    exact opposite of what was entered.
   * 2. **Everything else clears the oldest debt first.** A customer at
   *    Saturday's door hands over cash without naming a bill, and nobody should
   *    have to ask. This is what makes "he paid last week's but not this
   *    week's" come out as exactly that.
   *
   * Overflow from a named payment — more money than that bill was worth —
   * falls back into rule 2 rather than disappearing.
   *
   * Both arguments are sorted here rather than trusted from the caller. The
   * query already returns them in order, but the allocation is only correct in
   * that order, and a sort over one customer’s rows costs nothing next to
   * being silently wrong if a caller ever passes them another way.
   */
  allocate(
    payments: readonly LedgerPayment[],
    bills: readonly LedgerBill[],
  ): Map<string, number> {
    /**
     * Oldest first — the order money has to be applied in, and the whole of
     * rule 2.
     *
     * Sorted on `createdAt`, not on the code. Codes are strings, so a
     * lexicographic sort puts `TRX-1001` before `TRX-999`: correct only while
     * every id happens to have the same number of digits, and silently wrong
     * the moment one does not. Insertion time is the fact being sorted on
     * anyway.
     */
    const ordered = [...bills].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const inOrderTaken = [...payments].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const covered = new Map<string, number>();
    for (const bill of ordered) covered.set(bill.code, 0);

    /** Code to bill, so a named payment is a lookup and not a scan per row. */
    const byCode = new Map(ordered.map((bill) => [bill.code, bill]));

    let pool = 0;

    for (const payment of inOrderTaken) {
      const target = payment.appliesTo ? byCode.get(payment.appliesTo) : undefined;

      if (!target) {
        pool += payment.amountMinor;
        continue;
      }

      const room = target.totalMinor - (covered.get(target.code) ?? 0);
      const take = Math.min(payment.amountMinor, Math.max(0, room));
      covered.set(target.code, (covered.get(target.code) ?? 0) + take);
      pool += payment.amountMinor - take;
    }

    for (const bill of ordered) {
      const room = bill.totalMinor - (covered.get(bill.code) ?? 0);
      const take = Math.min(pool, Math.max(0, room));
      covered.set(bill.code, (covered.get(bill.code) ?? 0) + take);
      pool -= take;
    }

    return covered;
  }

  /**
   * What a customer owes right now: everything billed, less everything paid.
   *
   * Sums `total` and **never** `grandTotal`. `previousBalance` on a bill is a
   * snapshot printed on that day's docket, not a debt of its own — adding it
   * here would charge the same money again every time it appeared on a later
   * receipt, so the debt would compound each week it rolled forward.
   */
  balanceMinor(bills: readonly LedgerBill[], paidMinor: number): number {
    const billed = bills.reduce((sum, bill) => sum + bill.totalMinor, 0);
    return billed - paidMinor;
  }

  /** Derived from the ledger, never chosen by the cashier. */
  status(settledMinor: number, totalMinor: number): PaymentStatus {
    if (settledMinor >= totalMinor) return PaymentStatus.Paid;
    return settledMinor > 0 ? PaymentStatus.Partial : PaymentStatus.Unpaid;
  }
}
