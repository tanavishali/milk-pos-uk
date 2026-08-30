import type { DashboardMetrics, Order, OrderDraft } from "@app-types/index";
import { PaymentStatus } from "@enums/index";
import { formatTimestamp } from "@utils/helper/index";
import { paymentsMock } from "./payments.mock";
import { findKnownCustomer, knownCustomerCount } from "./knownCustomers";
import { productsMock } from "./products.mock";
import { db } from "./seed";
import type { StoredOrder } from "./types";
import { assertUniqueId, clone, nextId, round2 } from "./utils";

/**
 * One customer's bills, oldest first.
 *
 * `db.orders` is newest-first, so this reverses a copy. Oldest-first is the
 * order money has to be applied in — see `allocate`.
 */
function billsFor(customerId: string): StoredOrder[] {
  return db.orders.filter((o) => o.customerId === customerId).reverse();
}

/**
 * Spread what a customer has paid across their bills and return how much of each
 * is covered.
 *
 * Two rules, in order:
 *
 * 1. A payment that names a bill goes to that bill. That is the operator saying
 *    "this week is paid, last week is not" — applying it oldest-first anyway
 *    would settle last week's debt instead and leave this week's open, which is
 *    the opposite of what was entered.
 * 2. Everything else clears the oldest debt first. A customer at Saturday's door
 *    hands over cash without naming a bill, and nobody should have to ask. This
 *    is what makes "he paid last week's but not this week's" come out as exactly
 *    that: last week Paid, this week Unpaid, and the shortfall rolls on.
 *
 * Anything a named payment cannot absorb — more money than that bill was worth —
 * falls back into rule 2 rather than disappearing.
 */
function allocate(customerId: string): Record<string, number> {
  const bills = billsFor(customerId);
  const covered: Record<string, number> = {};
  for (const bill of bills) covered[bill.id] = 0;

  let pool = 0;
  for (const payment of paymentsMock.list(customerId)) {
    const target = payment.appliesTo
      ? bills.find((bill) => bill.id === payment.appliesTo)
      : undefined;

    if (!target) {
      pool = round2(pool + payment.amount);
      continue;
    }

    const room = round2(target.total - covered[target.id]!);
    const take = Math.min(payment.amount, room);
    covered[target.id] = round2(covered[target.id]! + take);
    pool = round2(pool + (payment.amount - take));
  }

  for (const bill of bills) {
    const room = round2(bill.total - covered[bill.id]!);
    const take = Math.min(pool, room);
    covered[bill.id] = round2(covered[bill.id]! + take);
    pool = round2(pool - take);
  }

  return covered;
}

function statusOf(settled: number, total: number): PaymentStatus {
  if (settled >= total) return PaymentStatus.Paid;
  return settled > 0 ? PaymentStatus.Partial : PaymentStatus.Unpaid;
}

/**
 * What a customer owes right now: everything billed, less everything paid.
 *
 * Sums `total` and never `grandTotal`. `previousBalance` on a bill is a snapshot
 * printed on that day's docket, not a debt of its own — adding it here would
 * charge the same money again every time it appeared on a later receipt.
 */
function balanceOf(customerId: string): number {
  const billed = billsFor(customerId).reduce((sum, o) => sum + o.total, 0);
  return round2(billed - paymentsMock.paidTotal(customerId));
}

/**
 * Attach the ledger-derived fields. Computed on read, never stored: the same
 * bill is Unpaid on Monday and Paid on Saturday without anything about the bill
 * itself changing, and a stored copy is a second truth waiting to drift.
 */
function decorate(rows: StoredOrder[]): Order[] {
  const cacheByCustomer = new Map<string, Record<string, number>>();
  const balances = new Map<string, number>();

  return rows.map((order) => {
    if (!cacheByCustomer.has(order.customerId)) {
      cacheByCustomer.set(order.customerId, allocate(order.customerId));
      balances.set(order.customerId, balanceOf(order.customerId));
    }

    const settledAmount = cacheByCustomer.get(order.customerId)![order.id] ?? 0;
    const receivedAtDelivery = round2(
      paymentsMock
        .forOrder(order.id)
        .reduce((sum, payment) => sum + payment.amount, 0),
    );

    return {
      ...clone(order),
      settledAmount,
      status: statusOf(settledAmount, order.total),
      receivedAtDelivery,
      customerBalance: balances.get(order.customerId) ?? 0,
    };
  });
}

export const ordersMock = {
  list(): Order[] {
    return decorate(db.orders);
  },

  find(id: string): Order | undefined {
    const row = db.orders.find((o) => o.id === id);
    return row ? decorate([row])[0] : undefined;
  },

  /**
   * Raise a bill. The customer is *copied* onto it rather than referenced, so
   * editing or deleting the customer later leaves already-issued receipts
   * intact. Stock is drawn down in the same step, because a receipt that printed
   * without moving inventory is the one bug a POS cannot have.
   *
   * No payment is taken here. The bill is raised before the van leaves; the cash
   * turns up at the door, or next week, or in part — all of which is the
   * ledger's business, not this function's.
   */
  create(draft: OrderDraft): Order {
    // Customers moved to the API; this reads the copy `customersApi` leaves
    // behind, which is populated as soon as the directory has been loaded once.
    const customer = findKnownCustomer(draft.customerId);
    if (!customer) throw new Error(`Customer ${draft.customerId} not found`);

    const lines = draft.items.filter((line) => line.qty > 0);
    if (lines.length === 0) throw new Error("An order needs at least one line");

    // The name is resolved from the id, not taken from the caller — so the
    // receipt and the driver's scope can never disagree about who delivers it.
    const courier = db.couriers.find((c) => c.id === draft.courierId);

    const id = nextId("TRX", db.orders);
    assertUniqueId("orders", id, db.orders);

    // Read from the ledger, never supplied by the caller: a client-side figure
    // would let the till decide what a customer owes.
    const previousBalance = Math.max(0, balanceOf(draft.customerId));
    const total = round2(
      lines.reduce((sum, line) => sum + line.qty * line.price, 0),
    );

    const created: StoredOrder = {
      id,
      date: formatTimestamp(new Date()),
      customerId: customer.id,
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        area: customer.area,
        postcode: customer.postcode,
        round: customer.round,
      },
      courier: courier?.name ?? "Unassigned",
      courierId: courier?.id ?? "",
      items: lines,
      total,
      previousBalance,
      grandTotal: round2(total + previousBalance),
    };

    db.orders.unshift(created);
    productsMock.decrementStock(lines);

    return decorate([created])[0]!;
  },

  /**
   * What this customer still owes, and on which bills.
   *
   * Scoped by `customerId`, never by name: two customers can share a name, and
   * a rename must not lose someone's balance.
   */
  outstanding(customerId: string): {
    /** The bills still open, newest first. */
    orders: Order[];
    /** The running balance. */
    total: number;
    /** How much of those open bills is already covered. */
    paid: number;
  } {
    const rows = decorate(billsFor(customerId).slice().reverse()).filter(
      (o) => o.status !== PaymentStatus.Paid,
    );

    return {
      orders: rows,
      total: Math.max(0, balanceOf(customerId)),
      // Money already applied to *these* bills, not everything the customer has
      // ever paid: a lifetime total sitting beside a list of open bills reads as
      // though they were part-settled by it.
      paid: round2(rows.reduce((sum, o) => sum + o.settledAmount, 0)),
    };
  },

  /** The running balance on its own, for a badge or a door-step figure. */
  balance(customerId: string): number {
    return balanceOf(customerId);
  },

  /**
   * One courier's deliveries. Scoped by id, never by name: two couriers can
   * share a name, and matching on it would show a driver someone else's work.
   */
  forCourier(courierId: string): Order[] {
    return decorate(db.orders.filter((o) => o.courierId === courierId));
  },

  metrics(): DashboardMetrics {
    const billed = db.orders.reduce((sum, o) => sum + o.total, 0);
    const collected = db.payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      // Goods sold, counted when the bill is raised — not when the cash lands.
      grossProfit: round2(billed),
      collected: round2(collected),
      outstanding: round2(billed - collected),
      totalOrders: db.orders.length,
      totalCustomers: knownCustomerCount(),
      totalCouriers: db.couriers.length,
    };
  },

  /**
   * The dashboard's activity log. Relies on `db.orders` being newest-first
   * (see `seed.ts`), so the head of the array is the most recent activity.
   */
  recent(limit = 4): Order[] {
    return decorate(db.orders.slice(0, limit));
  },
};
