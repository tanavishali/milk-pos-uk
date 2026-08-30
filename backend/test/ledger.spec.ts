import { beforeEach, describe, expect, it } from 'vitest';
import { PaymentStatus } from '../src/common/enums';
import { toMinorUnits } from '../src/common/utils/money';
import { LedgerService } from '../src/modules/orders/ledger.service';
import type { OrderDocument } from '../src/modules/orders/schemas/order.schema';
import type { PaymentsService } from '../src/modules/payments/payments.service';
import type { PaymentDocument } from '../src/modules/payments/schemas/payment.schema';

/**
 * The money model, in the terms the business uses.
 *
 * Ported from `frontend/test/mockIds.test.ts`, which pinned this behaviour
 * while the ledger lived in the in-memory mock. The mock is gone; the rules did
 * not change, so neither did these cases — they are the specification for
 * `LedgerService`, and they are here because that is where the logic is now.
 *
 * These are unit tests over the arithmetic: no database, no HTTP. A stub stands
 * in for `PaymentsService`, and `raise()` reproduces exactly what
 * `OrdersService.create` does with the balance — snapshot it, never re-charge
 * it.
 */

/** A ledger harness for one customer, mirroring how the service uses it. */
class Round {
  private readonly bills: OrderDocument[] = [];
  private readonly payments: PaymentDocument[] = [];
  private clock = 0;
  private nextBill = 8901;
  private nextPayment = 101;

  private readonly ledger = new LedgerService({
    /** Oldest first, which is the order the real query returns them in. */
    ledgerRowsFor: (customerId: string) =>
      Promise.resolve(this.payments.filter((p) => p.customerId === customerId)),
  } as unknown as PaymentsService);

  constructor(private readonly customerId = 'CUST-101') {}

  /**
   * Raise a bill, snapshotting the balance onto it exactly as the service does.
   * Returns the figures the docket prints.
   */
  async raise(amount: number) {
    const balance = await this.balanceMinor();
    /** A credit balance is not a debt to print on the next docket. */
    const previousBalanceMinor = Math.max(0, balance);
    const totalMinor = toMinorUnits(amount);

    const code = `TRX-${this.nextBill++}`;
    this.bills.push({
      code,
      customerId: this.customerId,
      totalMinor,
      createdAt: new Date(2026, 0, 1, 0, this.clock++),
    } as OrderDocument);

    return {
      id: code,
      total: totalMinor / 100,
      previousBalance: previousBalanceMinor / 100,
      grandTotal: (totalMinor + previousBalanceMinor) / 100,
    };
  }

  /** Money in. `appliesTo` names a bill; omitting it clears the oldest debt. */
  pay(amount: number, opts: { orderId?: string; appliesTo?: string } = {}) {
    const code = `PAY-${this.nextPayment++}`;
    this.payments.push({
      code,
      customerId: this.customerId,
      orderId: opts.orderId,
      appliesTo: opts.appliesTo,
      amountMinor: toMinorUnits(amount),
      createdAt: new Date(2026, 0, 1, 0, this.clock++),
    } as PaymentDocument);
    return code;
  }

  /** Reverse a mis-keyed collection. */
  reverse(code: string) {
    const index = this.payments.findIndex((p) => p.code === code);
    this.payments.splice(index, 1);
  }

  private async paidTotalMinor() {
    return this.payments
      .filter((p) => p.customerId === this.customerId)
      .reduce((sum, p) => sum + p.amountMinor, 0);
  }

  private async balanceMinor() {
    return this.ledger.balanceMinor(this.bills, await this.paidTotalMinor());
  }

  async balance() {
    return (await this.balanceMinor()) / 100;
  }

  async settled(code: string) {
    const covered = await this.ledger.allocate(this.customerId, this.bills);
    return (covered.get(code) ?? 0) / 100;
  }

  async statusOf(code: string) {
    const covered = await this.ledger.allocate(this.customerId, this.bills);
    const bill = this.bills.find((b) => b.code === code)!;
    return this.ledger.status(covered.get(code) ?? 0, bill.totalMinor);
  }

  /** Cash taken at one particular door — where it came in, not where it went. */
  receivedAtDelivery(code: string) {
    return (
      this.payments
        .filter((p) => p.orderId === code)
        .reduce((sum, p) => sum + p.amountMinor, 0) / 100
    );
  }

  async openBills() {
    const statuses = await Promise.all(
      this.bills.map(async (bill) => this.statusOf(bill.code)),
    );
    return statuses.filter((status) => status !== PaymentStatus.Paid).length;
  }
}

describe('billing cycle', () => {
  let round: Round;

  beforeEach(() => {
    round = new Round();
  });

  it('a new bill is unpaid until money arrives', async () => {
    const first = await round.raise(10);

    expect(await round.statusOf(first.id)).toBe(PaymentStatus.Unpaid);
    expect(first.previousBalance).toBe(0);
    expect(first.grandTotal).toBe(10);
    expect(await round.balance()).toBe(10);
  });

  it('shows the old balance on the next bill without re-charging it', async () => {
    await round.raise(10);
    const second = await round.raise(25);

    // The docket says what is due at the door...
    expect(second.previousBalance).toBe(10);
    expect(second.grandTotal).toBe(35);
    // ...but the debt is 35 in total, not 45. Summing `grandTotal` would charge
    // the same money again every week it rolled forward.
    expect(await round.balance()).toBe(35);
  });

  it('paid in full at the door clears the account', async () => {
    const first = await round.raise(10);
    round.pay(10, { orderId: first.id });

    expect(await round.statusOf(first.id)).toBe(PaymentStatus.Paid);
    expect(await round.balance()).toBe(0);
    expect(round.receivedAtDelivery(first.id)).toBe(10);
  });

  it('paying part of it leaves the rest on the account', async () => {
    const first = await round.raise(20);
    round.pay(12, { orderId: first.id });

    expect(await round.statusOf(first.id)).toBe(PaymentStatus.Partial);
    expect(await round.settled(first.id)).toBe(12);
    expect(await round.balance()).toBe(8);
  });

  /** The operator's scenario, exactly: pays last week's, not this week's. */
  it("paying only the previous bill settles that one and carries today's", async () => {
    const week1 = await round.raise(10);
    const week2 = await round.raise(25);

    // At week 2's door the customer hands over 10 — last week's amount.
    round.pay(10, { orderId: week2.id });

    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Unpaid);
    expect(await round.balance()).toBe(25);

    // The cash is recorded where it was taken, not where it was applied.
    expect(round.receivedAtDelivery(week2.id)).toBe(10);
    expect(round.receivedAtDelivery(week1.id)).toBe(0);
  });

  it('nothing paid at the door leaves both bills open and adds up', async () => {
    await round.raise(10);
    await round.raise(25);

    expect(await round.openBills()).toBe(2);
    expect(await round.balance()).toBe(35);
  });

  it('clears the oldest debt first over three weeks', async () => {
    const week1 = await round.raise(10);
    const week2 = await round.raise(20);
    round.pay(15, { orderId: week2.id });

    // 15 covers week 1 whole and 5 of week 2.
    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(await round.settled(week2.id)).toBe(5);
    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Partial);

    const week3 = await round.raise(30);
    expect(week3.previousBalance).toBe(15);
    expect(week3.grandTotal).toBe(45);

    round.pay(45, { orderId: week3.id });
    expect(await round.balance()).toBe(0);
    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Paid);
    expect(await round.statusOf(week3.id)).toBe(PaymentStatus.Paid);
  });

  it('keeps the cent arithmetic exact across a run of odd amounts', async () => {
    // 24.5 + 9.99 in floating point is 34.489999999999995, which would read as
    // Part Paid after a payment of exactly 34.49. In pence it is 3449 = 3449.
    const a = await round.raise(24.5);
    const b = await round.raise(9.99);
    expect(b.previousBalance).toBe(24.5);
    expect(b.grandTotal).toBe(34.49);

    round.pay(34.49, { orderId: b.id });
    expect(await round.balance()).toBe(0);
    expect(await round.statusOf(a.id)).toBe(PaymentStatus.Paid);
    expect(await round.statusOf(b.id)).toBe(PaymentStatus.Paid);
  });

  it('reversing a mis-keyed payment puts the balance back', async () => {
    const first = await round.raise(10);
    const payment = round.pay(10, { orderId: first.id });
    expect(await round.balance()).toBe(0);

    round.reverse(payment);

    // Nothing needed repairing: every status is derived on read.
    expect(await round.balance()).toBe(10);
    expect(await round.statusOf(first.id)).toBe(PaymentStatus.Unpaid);
  });

  it('overflow from a named payment falls back to the oldest debt', async () => {
    const week1 = await round.raise(50);
    const week2 = await round.raise(10);

    // 40 named at week 2: 10 fits, the other 30 must not vanish.
    round.pay(40, { orderId: week2.id, appliesTo: week2.id });

    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Paid);
    expect(await round.settled(week1.id)).toBe(30);
    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Partial);
    expect(await round.balance()).toBe(20);
  });
});

/**
 * The four answers step 4 of the wizard can produce, which are the four things
 * that actually happen on a round: pay both, pay only last week's, pay only
 * this week's, pay nothing. `appliesTo` is what keeps the third one honest.
 */
describe('marked at bill generation', () => {
  let round: Round;

  beforeEach(() => {
    round = new Round();
  });

  /** What the wizard does after `create`, given step 4's two answers. */
  const generate = async (
    price: number,
    { billPaid, clearPrevious }: { billPaid: boolean; clearPrevious: boolean },
  ) => {
    const order = await round.raise(price);

    const clearing = order.previousBalance > 0 && clearPrevious;
    const amount =
      (billPaid ? order.total : 0) + (clearing ? order.previousBalance : 0);

    if (amount > 0) {
      round.pay(amount, {
        orderId: order.id,
        ...(billPaid && !clearing && order.previousBalance > 0
          ? { appliesTo: order.id }
          : {}),
      });
    }

    return order;
  };

  it('paid on the spot leaves nothing behind', async () => {
    const week1 = await generate(50, { billPaid: true, clearPrevious: false });

    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(await round.balance()).toBe(0);
  });

  it("unpaid becomes next week's previous bill", async () => {
    const week1 = await generate(50, { billPaid: false, clearPrevious: false });
    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Unpaid);

    const week2 = await generate(40, { billPaid: false, clearPrevious: false });
    expect(week2.previousBalance).toBe(50);
    expect(week2.grandTotal).toBe(90);
    expect(await round.balance()).toBe(90);
  });

  it('clearing both at the next delivery closes both bills', async () => {
    const week1 = await generate(50, { billPaid: false, clearPrevious: false });
    const week2 = await generate(40, { billPaid: true, clearPrevious: true });

    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Paid);
    expect(await round.balance()).toBe(0);
  });

  it('clearing only the previous bill carries this one forward', async () => {
    const week1 = await generate(50, { billPaid: false, clearPrevious: false });
    const week2 = await generate(40, { billPaid: false, clearPrevious: true });

    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Unpaid);
    expect(await round.balance()).toBe(40);

    // ...and next week it is week 2 that shows up as the previous bill.
    const week3 = await generate(30, { billPaid: false, clearPrevious: false });
    expect(week3.previousBalance).toBe(40);
    expect(await round.balance()).toBe(70);
  });

  /**
   * The case that needs the payment to name its bill. Oldest-first would put
   * this week's cash against last week's debt and report the exact opposite of
   * what was entered.
   */
  it('paying only this bill leaves the older one open', async () => {
    const week1 = await generate(50, { billPaid: false, clearPrevious: false });
    const week2 = await generate(40, { billPaid: true, clearPrevious: false });

    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Paid);
    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Unpaid);
    expect(await round.balance()).toBe(50);
  });

  it('paying neither leaves both open and rolls the lot on', async () => {
    const week1 = await generate(50, { billPaid: false, clearPrevious: false });
    const week2 = await generate(40, { billPaid: false, clearPrevious: false });

    expect(await round.statusOf(week1.id)).toBe(PaymentStatus.Unpaid);
    expect(await round.statusOf(week2.id)).toBe(PaymentStatus.Unpaid);
    expect(await round.openBills()).toBe(2);
    expect(await round.balance()).toBe(90);
  });

  it('runs the loop over four weeks without losing a cent', async () => {
    await generate(50, { billPaid: false, clearPrevious: false });
    await generate(40, { billPaid: false, clearPrevious: false });
    expect(await round.balance()).toBe(90);

    const week3 = await generate(30, { billPaid: false, clearPrevious: true });
    expect(week3.previousBalance).toBe(90);
    expect(week3.grandTotal).toBe(120);
    expect(await round.balance()).toBe(30);

    const week4 = await generate(20, { billPaid: true, clearPrevious: true });
    expect(week4.previousBalance).toBe(30);
    expect(await round.balance()).toBe(0);
    expect(await round.openBills()).toBe(0);
  });
});

describe('scoping', () => {
  it('scopes a balance to one customer', async () => {
    const zainab = new Round('CUST-101');
    const hamza = new Round('CUST-102');

    await hamza.raise(20);
    await zainab.raise(10);

    expect(await hamza.balance()).toBe(20);
    expect(await zainab.balance()).toBe(10);
  });
});
