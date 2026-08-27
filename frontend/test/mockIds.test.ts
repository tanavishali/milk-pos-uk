import { beforeEach, describe, expect, it } from "vitest";
import { PaymentType } from "@enums/index";
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
      includePrevious: false,
      paymentType: PaymentType.Paid,
      items: [{ productId: "PROD-101", name: "x", qty: 1, price: 1 }],
    });
    expect(first.id).toBe("TRX-8921");

    resetDatabase();

    const afterReset = mockDb.orders.create({
      customerId: db.customers[0]!.id,
      courierId: "COUR-101",
      includePrevious: false,
      paymentType: PaymentType.Paid,
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
        includePrevious: false,
        paymentType: PaymentType.Paid,
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

describe("carried-forward balance", () => {
  beforeEach(resetDatabase);

  const draft = (
    paymentType: PaymentType,
    includePrevious: boolean,
    price = 10,
  ) => ({
    customerId: "CUST-101",
    courierId: "COUR-101",
    paymentType,
    includePrevious,
    items: [{ productId: "PROD-101", name: "Cake", qty: 1, price }],
  });

  it("reports nil when the customer owes nothing", () => {
    // CUST-101's seeded order is Paid, so there is nothing outstanding.
    expect(mockDb.orders.outstanding("CUST-101").total).toBe(0);
  });

  it("carries an unpaid bill into the next one and totals both", () => {
    const first = mockDb.orders.create(draft(PaymentType.OnCredit, false, 10));
    expect(first.grandTotal).toBe(10);
    expect(mockDb.orders.outstanding("CUST-101").total).toBe(10);

    const second = mockDb.orders.create(draft(PaymentType.Paid, true, 25));
    expect(second.total).toBe(25);
    expect(second.previousBalance).toBe(10);
    expect(second.grandTotal).toBe(35);
  });

  /**
   * The hazard this feature introduces: if carrying a debt forward does not
   * settle the bill it came from, the same money is billed again on every
   * subsequent visit.
   */
  it("does not bill the same debt twice", () => {
    mockDb.orders.create(draft(PaymentType.OnCredit, false, 10));
    mockDb.orders.create(draft(PaymentType.Paid, true, 25));

    expect(mockDb.orders.outstanding("CUST-101").total).toBe(0);

    const third = mockDb.orders.create(draft(PaymentType.Paid, true, 5));
    expect(third.previousBalance).toBe(0);
    expect(third.grandTotal).toBe(5);
  });

  it("leaves the debt outstanding when it is not carried", () => {
    mockDb.orders.create(draft(PaymentType.OnCredit, false, 10));
    const next = mockDb.orders.create(draft(PaymentType.Paid, false, 25));

    expect(next.previousBalance).toBe(0);
    expect(mockDb.orders.outstanding("CUST-101").total).toBe(10);
  });

  it("rolls a credit bill forward into another credit bill", () => {
    mockDb.orders.create(draft(PaymentType.OnCredit, false, 10));
    const rolled = mockDb.orders.create(draft(PaymentType.OnCredit, true, 20));

    expect(rolled.grandTotal).toBe(30);
    // The old bill is settled by the new one, which now carries the whole debt.
    expect(mockDb.orders.outstanding("CUST-101").total).toBe(30);
  });

  it("scopes outstanding to one customer", () => {
    // CUST-102 arrives with a seeded unpaid bill of its own; CUST-101 running up
    // a debt must not change it.
    const before = mockDb.orders.outstanding("CUST-102").total;
    expect(before).toBeGreaterThan(0);

    mockDb.orders.create(draft(PaymentType.OnCredit, false, 10));

    expect(mockDb.orders.outstanding("CUST-102").total).toBe(before);
    expect(mockDb.orders.outstanding("CUST-101").total).toBe(10);
  });
});
