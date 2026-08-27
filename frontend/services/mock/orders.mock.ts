import type { DashboardMetrics, Order, OrderDraft } from "@app-types/index";
import { PaymentType } from "@enums/index";
import { formatTimestamp } from "@utils/helper/index";
import { productsMock } from "./products.mock";
import { db } from "./seed";
import { assertUniqueId, clone, nextId } from "./utils";

/**
 * The unsettled credit rows for one customer, newest first.
 *
 * A private helper rather than a method: `create` needs the live rows so it can
 * stamp `settledBy` on them, while callers outside get clones.
 */
function outstandingRows(customerId: string): Order[] {
  return db.orders.filter(
    (o) =>
      o.customerId === customerId &&
      o.paymentType === PaymentType.OnCredit &&
      !o.settledBy,
  );
}

export const ordersMock = {
  list(): Order[] {
    return clone(db.orders);
  },

  find(id: string): Order | undefined {
    return clone(db.orders.find((o) => o.id === id));
  },

  /**
   * Issue an order. The customer is *copied* onto the order rather than
   * referenced, so editing or deleting the customer later leaves already-issued
   * receipts intact. Stock is drawn down in the same step, because a receipt
   * that printed without moving inventory is the one bug a POS cannot have.
   */
  create(draft: OrderDraft): Order {
    const customer = db.customers.find((c) => c.id === draft.customerId);
    if (!customer) throw new Error(`Customer ${draft.customerId} not found`);

    const lines = draft.items.filter((line) => line.qty > 0);
    if (lines.length === 0) throw new Error("An order needs at least one line");

    // The name is resolved from the id, not taken from the caller — so the
    // receipt and the driver's scope can never disagree about who delivers it.
    const courier = db.couriers.find((c) => c.id === draft.courierId);

    const id = nextId("TRX", db.orders);
    assertUniqueId("orders", id, db.orders);

    // Computed here, never taken from the caller: a client-supplied figure would
    // let the till decide what a customer owes.
    const carried = draft.includePrevious
      ? outstandingRows(draft.customerId)
      : [];
    const previousBalance = carried.reduce((sum, o) => sum + o.grandTotal, 0);
    const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);

    const created: Order = {
      id,
      date: formatTimestamp(new Date()),
      customerId: customer.id,
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        postcode: customer.postcode,
        round: customer.round,
      },
      courier: courier?.name ?? "Unassigned",
      courierId: courier?.id ?? "",
      items: lines,
      paymentType: draft.paymentType,
      total,
      previousBalance,
      grandTotal: total + previousBalance,
    };

    db.orders.unshift(created);
    productsMock.decrementStock(lines);

    // Mark what was rolled forward. Without this the same debt is fetched again
    // on the next visit and billed twice — the whole point of carrying it is
    // that it stops being outstanding on its own.
    for (const row of carried) {
      const target = db.orders.find((o) => o.id === row.id);
      if (target) target.settledBy = id;
    }

    return clone(created);
  },

  /**
   * What this customer still owes, and on which bills.
   *
   * An order counts as outstanding while it is `OnCredit` *and* has not been
   * absorbed by a later one. Scoped by `customerId`, not by name.
   */
  outstanding(customerId: string): { orders: Order[]; total: number } {
    const rows = outstandingRows(customerId);
    return {
      orders: clone(rows),
      total: rows.reduce((sum, o) => sum + o.grandTotal, 0),
    };
  },

  /**
   * One courier's deliveries. Scoped by id, never by name: two couriers can
   * share a name, and matching on it would show a driver someone else's work.
   */
  forCourier(courierId: string): Order[] {
    return clone(db.orders.filter((o) => o.courierId === courierId));
  },

  metrics(): DashboardMetrics {
    return {
      grossProfit: db.orders.reduce((sum, o) => sum + o.total, 0),
      totalOrders: db.orders.length,
      totalCustomers: db.customers.length,
      totalCouriers: db.couriers.length,
    };
  },

  /**
   * The dashboard's activity log. Relies on `db.orders` being newest-first
   * (see `seed.ts`), so the head of the array is the most recent activity.
   */
  recent(limit = 4): Order[] {
    return clone(db.orders.slice(0, limit));
  },
};
