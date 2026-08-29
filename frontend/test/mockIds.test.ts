import { beforeEach, describe, expect, it } from "vitest";
import { PaymentStatus } from "@enums/index";
import { mockDb } from "@services/mock/index";
import { db, resetDatabase } from "@services/mock/seed";
import { assertUniqueId, nextId } from "@services/mock/utils";

/**
 * Ids minted by the mock backend must never collide with an id already in use.
 *
 * This is not hypothetical: the previous generator was
 * `` `${prefix}-${Date.now() % 10000}` ``, which draws from 0000-9999 while the
 * seed occupies TRX-8901..TRX-8920 — so about one sale in 500 minted a duplicate
 * and React rendered two rows fighting over the same key.
 */
describe("nextId", () => {
  it("continues the seed's numbering rather than restarting", () => {
    expect(nextId("TRX", [{ id: "TRX-8919" }, { id: "TRX-8920" }])).toBe(
      "TRX-8921",
    );
  });

  it("starts at 1 when nothing exists yet", () => {
    expect(nextId("CUST", [])).toBe("CUST-1");
  });

  it("ignores rows belonging to another prefix", () => {
    const rows = [{ id: "PROD-9999" }, { id: "TRX-4" }];
    expect(nextId("TRX", rows)).toBe("TRX-5");
  });

  it("ignores ids that are not of the form PREFIX-<number>", () => {
    const rows = [{ id: "TRX-legacy" }, { id: "TRX-7" }, { id: "malformed" }];
    expect(nextId("TRX", rows)).toBe("TRX-8");
  });

  it("takes the maximum in use, not the array's last element", () => {
    // `create()` unshifts, so the newest row is at index 0 — a generator that
    // read the tail would hand back an id that already exists.
    const rows = [{ id: "TRX-8920" }, { id: "TRX-8901" }];
    expect(nextId("TRX", rows)).toBe("TRX-8921");
  });
});

describe("assertUniqueId", () => {
  it("throws when an id is already present, naming it", () => {
    expect(() =>
      assertUniqueId("orders", "TRX-8904", [{ id: "TRX-8904" }]),
    ).toThrow(/TRX-8904/);
  });

  it("passes when the id is new", () => {
    expect(() =>
      assertUniqueId("orders", "TRX-8921", [{ id: "TRX-8904" }]),
    ).not.toThrow();
  });
});

describe("mock backend id uniqueness", () => {
  // The store is module state shared across tests.
  const seedSnapshot = {
    customers: [...db.customers],
    products: [...db.products],
    couriers: [...db.couriers],
    orders: [...db.orders],
    payments: [...db.payments],
  };

  beforeEach(resetDatabase);

  it("seed data itself has no duplicate ids", () => {
    for (const [name, rows] of Object.entries(seedSnapshot)) {
      const ids = rows.map((r) => r.id);
      expect(new Set(ids).size, `${name} has duplicate ids`).toBe(ids.length);
    }
  });

  it("no seed order repeats a productId, so receipt rows stay unique", () => {
    for (const order of db.orders) {
      const ids = order.items.map((line) => line.productId);
      expect(new Set(ids).size, `${order.id} repeats a product`).toBe(
        ids.length,
      );
    }
  });

  it("creating 200 customers never reuses an id", () => {
    for (let i = 0; i < 200; i += 1) {
      mockDb.customers.create({
        name: `Test ${i}`,
        phone: "+92 300 0000000",
        round: "",
        deliveryDays: [],
        email: "test@example.com",
        area: "Nowhere",
        address: "Nowhere",
        postcode: "00000",
      });
    }
    const ids = db.customers.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("survives a reset and still continues the seed numbering", () => {
    const first = mockDb.orders.create({
      customerId: db.customers[0]!.id,
      courierId: "COUR-101",
      items: [{ productId: "PROD-101", name: "x", qty: 1, price: 1 }],
    });
    expect(first.id).toBe("TRX-8921");

    resetDatabase();

    const afterReset = mockDb.orders.create({
      customerId: db.customers[0]!.id,
      courierId: "COUR-101",
      items: [{ productId: "PROD-101", name: "x", qty: 1, price: 1 }],
    });
    expect(afterReset.id).toBe("TRX-8921");
  });

  it("creating 200 orders never reuses an id, seed range included", () => {
    const product = db.products[0]!;
    const customer = db.customers[0]!;

    for (let i = 0; i < 200; i += 1) {
      mockDb.orders.create({
        customerId: customer.id,
        courierId: "COUR-101",
        items: [
          { productId: product.id, name: product.name, qty: 1, price: 1 },
        ],
      });
    }

    const ids = db.orders.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    // And none of them landed on a seed id.
    expect(ids.filter((id) => id === "TRX-8904")).toHaveLength(1);
  });
});

/**
 * The delivery round's billing cycle.
 *
 * The shape of the business, in the operator's own words: a bill is raised
 * before the van leaves; at the door the customer pays all of it, some of it,
 * only what was owed from last week, or nothing at all; the rest rides along to
 * the next delivery. Every case below is one of those sentences.
 */
describe("billing cycle", () => {
  beforeEach(resetDatabase);

  /** A bill for CUST-101. No payment attached — that is a separate event. */
  const bill = (price: number) =>
    mockDb.orders.create({
      customerId: "CUST-101",
      courierId: "COUR-101",
      items: [{ productId: "PROD-101", name: "Milk", qty: 1, price }],
    });

  const pay = (amount: number, orderId?: string) =>
    mockDb.payments.create({
      customerId: "CUST-101",
      orderId,
      amount,
      receivedBy: "Bilal Khan",
    });

  const balance = () => mockDb.orders.balance("CUST-101");
  const statusOf = (id: string) => mockDb.orders.find(id)!.status;

  it("starts clear when the seeded bills are all settled", () => {
    // CUST-101's seeded delivery has a matching seeded payment.
    expect(balance()).toBe(0);
    expect(mockDb.orders.outstanding("CUST-101").total).toBe(0);
  });

  it("a new bill is unpaid until money arrives", () => {
    const first = bill(10);

    expect(first.status).toBe(PaymentStatus.Unpaid);
    expect(first.previousBalance).toBe(0);
    expect(first.grandTotal).toBe(10);
    expect(balance()).toBe(10);
  });

  it("shows the old balance on the next bill without re-charging it", () => {
    bill(10);
    const second = bill(25);

    // The docket says what is due at the door...
    expect(second.previousBalance).toBe(10);
    expect(second.grandTotal).toBe(35);
    // ...but the debt is 35 in total, not 45. This is the double-charge the
    // old "fold the previous balance into the new bill" model risked.
    expect(balance()).toBe(35);
  });

  it("paid in full at the door clears the account", () => {
    const first = bill(10);
    pay(10, first.id);

    expect(statusOf(first.id)).toBe(PaymentStatus.Paid);
    expect(balance()).toBe(0);
    expect(mockDb.orders.find(first.id)!.receivedAtDelivery).toBe(10);
  });

  it("paying part of it leaves the rest on the account", () => {
    const first = bill(20);
    pay(12, first.id);

    const row = mockDb.orders.find(first.id)!;
    expect(row.status).toBe(PaymentStatus.Partial);
    expect(row.settledAmount).toBe(12);
    expect(balance()).toBe(8);
  });

  /** The operator's scenario, exactly: pays last week's, not this week's. */
  it("paying only the previous bill settles that one and carries today's", () => {
    const week1 = bill(10);
    const week2 = bill(25);

    // At week 2's door the customer hands over 10 — last week's amount.
    pay(10, week2.id);

    expect(statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(statusOf(week2.id)).toBe(PaymentStatus.Unpaid);
    expect(balance()).toBe(25);

    // The cash is recorded where it was taken, not where it was applied.
    expect(mockDb.orders.find(week2.id)!.receivedAtDelivery).toBe(10);
    expect(mockDb.orders.find(week1.id)!.receivedAtDelivery).toBe(0);
  });

  it("nothing paid at the door leaves both bills open and adds up", () => {
    bill(10);
    bill(25);

    const open = mockDb.orders.outstanding("CUST-101");
    expect(open.orders).toHaveLength(2);
    expect(open.total).toBe(35);
    expect(open.paid).toBe(0);
  });

  it("clears the oldest debt first over three weeks", () => {
    const week1 = bill(10);
    const week2 = bill(20);
    pay(15, week2.id);

    // 15 covers week 1 whole and 5 of week 2.
    expect(statusOf(week1.id)).toBe(PaymentStatus.Paid);
    expect(mockDb.orders.find(week2.id)!.settledAmount).toBe(5);
    expect(statusOf(week2.id)).toBe(PaymentStatus.Partial);

    const week3 = bill(30);
    expect(week3.previousBalance).toBe(15);
    expect(week3.grandTotal).toBe(45);

    pay(45, week3.id);
    expect(balance()).toBe(0);
    expect(statusOf(week2.id)).toBe(PaymentStatus.Paid);
    expect(statusOf(week3.id)).toBe(PaymentStatus.Paid);
  });

  it("keeps the cent arithmetic exact across a run of odd amounts", () => {
    // 24.5 + 9.99 in floating point is 34.489999999999995, which would read as
    // Part Paid after a payment of exactly 34.49.
    const a = bill(24.5);
    const b = bill(9.99);
    expect(mockDb.orders.find(b.id)!.previousBalance).toBe(24.5);
    expect(b.grandTotal).toBe(34.49);

    pay(34.49, b.id);
    expect(balance()).toBe(0);
    expect(statusOf(a.id)).toBe(PaymentStatus.Paid);
    expect(statusOf(b.id)).toBe(PaymentStatus.Paid);
  });

  it("refuses a payment of nothing", () => {
    expect(() => pay(0)).toThrow(/above zero/);
  });

  it("reversing a mis-keyed payment puts the balance back", () => {
    const first = bill(10);
    const payment = pay(10, first.id);
    expect(balance()).toBe(0);

    mockDb.payments.remove(payment.id);
    expect(balance()).toBe(10);
    expect(statusOf(first.id)).toBe(PaymentStatus.Unpaid);
  });

  /**
   * The four answers step 4 can produce, which are the four things that
   * actually happen on a round: pay both, pay only last week's, pay only this
   * week's, pay nothing. `appliesTo` is what keeps the third one honest.
   */
  describe("marked at bill generation", () => {
    /** What the wizard does after `create`, given step 4's two answers. */
    const generate = (
      price: number,
      {
        billPaid,
        clearPrevious,
      }: { billPaid: boolean; clearPrevious: boolean },
    ) => {
      const order = mockDb.orders.create({
        customerId: "CUST-101",
        courierId: "COUR-101",
        items: [{ productId: "PROD-101", name: "Milk", qty: 1, price }],
      });

      const clearing = order.previousBalance > 0 && clearPrevious;
      const amount =
        (billPaid ? order.total : 0) + (clearing ? order.previousBalance : 0);

      if (amount > 0) {
        mockDb.payments.create({
          customerId: "CUST-101",
          orderId: order.id,
          ...(billPaid && !clearing && order.previousBalance > 0
            ? { appliesTo: order.id }
            : {}),
          amount,
          receivedBy: "Bilal Khan",
        });
      }

      return order;
    };

    it("paid on the spot leaves nothing behind", () => {
      const week1 = generate(50, { billPaid: true, clearPrevious: false });

      expect(statusOf(week1.id)).toBe(PaymentStatus.Paid);
      expect(balance()).toBe(0);
    });

    it("unpaid becomes next week's previous bill", () => {
      const week1 = generate(50, { billPaid: false, clearPrevious: false });
      expect(statusOf(week1.id)).toBe(PaymentStatus.Unpaid);

      const week2 = generate(40, { billPaid: false, clearPrevious: false });
      expect(week2.previousBalance).toBe(50);
      expect(week2.grandTotal).toBe(90);
      expect(balance()).toBe(90);
    });

    it("clearing both at the next delivery closes both bills", () => {
      const week1 = generate(50, { billPaid: false, clearPrevious: false });
      const week2 = generate(40, { billPaid: true, clearPrevious: true });

      expect(statusOf(week1.id)).toBe(PaymentStatus.Paid);
      expect(statusOf(week2.id)).toBe(PaymentStatus.Paid);
      expect(balance()).toBe(0);
    });

    it("clearing only the previous bill carries this one forward", () => {
      const week1 = generate(50, { billPaid: false, clearPrevious: false });
      const week2 = generate(40, { billPaid: false, clearPrevious: true });

      expect(statusOf(week1.id)).toBe(PaymentStatus.Paid);
      expect(statusOf(week2.id)).toBe(PaymentStatus.Unpaid);
      expect(balance()).toBe(40);

      // ...and next week it is week 2 that shows up as the previous bill.
      const week3 = generate(30, { billPaid: false, clearPrevious: false });
      expect(week3.previousBalance).toBe(40);
      expect(balance()).toBe(70);
    });

    /**
     * The case that needs the payment to name its bill. Oldest-first would put
     * this week's cash against last week's debt and report the exact opposite
     * of what was entered.
     */
    it("paying only this bill leaves the older one open", () => {
      const week1 = generate(50, { billPaid: false, clearPrevious: false });
      const week2 = generate(40, { billPaid: true, clearPrevious: false });

      expect(statusOf(week2.id)).toBe(PaymentStatus.Paid);
      expect(statusOf(week1.id)).toBe(PaymentStatus.Unpaid);
      expect(balance()).toBe(50);
    });

    it("paying neither leaves both open and rolls the lot on", () => {
      const week1 = generate(50, { billPaid: false, clearPrevious: false });
      const week2 = generate(40, { billPaid: false, clearPrevious: false });

      expect(statusOf(week1.id)).toBe(PaymentStatus.Unpaid);
      expect(statusOf(week2.id)).toBe(PaymentStatus.Unpaid);
      expect(mockDb.orders.outstanding("CUST-101").orders).toHaveLength(2);
      expect(balance()).toBe(90);
    });

    it("runs the loop over four weeks without losing a cent", () => {
      // Mon+Sat weeks: 50 unpaid, 40 unpaid, then clear the older debt only,
      // then settle everything at the door.
      generate(50, { billPaid: false, clearPrevious: false });
      generate(40, { billPaid: false, clearPrevious: false });
      expect(balance()).toBe(90);

      const week3 = generate(30, { billPaid: false, clearPrevious: true });
      expect(week3.previousBalance).toBe(90);
      expect(week3.grandTotal).toBe(120);
      expect(balance()).toBe(30);

      const week4 = generate(20, { billPaid: true, clearPrevious: true });
      expect(week4.previousBalance).toBe(30);
      expect(balance()).toBe(0);
      expect(mockDb.orders.outstanding("CUST-101").orders).toHaveLength(0);
    });
  });

  it("scopes a balance to one customer", () => {
    // CUST-102 arrives with a seeded unpaid bill of its own; CUST-101 running up
    // a debt must not change it.
    const before = mockDb.orders.balance("CUST-102");
    expect(before).toBeGreaterThan(0);

    bill(10);

    expect(mockDb.orders.balance("CUST-102")).toBe(before);
    expect(balance()).toBe(10);
  });

  it("counts collected and outstanding across the whole round", () => {
    const before = mockDb.orders.metrics();
    // Summed in the test, so compared to the cent: adding two rounded figures
    // reintroduces exactly the float noise `round2` exists to keep out.
    expect(before.collected + before.outstanding).toBeCloseTo(
      before.grossProfit,
      2,
    );

    const first = bill(40);
    pay(15, first.id);

    const after = mockDb.orders.metrics();
    expect(after.grossProfit).toBeCloseTo(before.grossProfit + 40, 2);
    expect(after.collected).toBeCloseTo(before.collected + 15, 2);
    expect(after.outstanding).toBeCloseTo(before.outstanding + 25, 2);
  });
});
