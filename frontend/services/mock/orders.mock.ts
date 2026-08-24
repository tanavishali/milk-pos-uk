import type { DashboardMetrics, Order, OrderDraft } from "@app-types/index";
import { formatTimestamp } from "@utils/helper/index";
import { productsMock } from "./products.mock";
import { db } from "./seed";
import { assertUniqueId, clone, nextId } from "./utils";

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

    const id = nextId("TRX", db.orders);
    assertUniqueId("orders", id, db.orders);

    const created: Order = {
      id,
      date: formatTimestamp(new Date()),
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
      },
      courier: draft.courier || "Unassigned",
      items: lines,
      paymentType: draft.paymentType,
      total: lines.reduce((sum, line) => sum + line.qty * line.price, 0),
    };

    db.orders.unshift(created);
    productsMock.decrementStock(lines);
    return clone(created);
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
