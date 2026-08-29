import type { Payment, PaymentDraft } from "@app-types/index";
import { formatTimestamp } from "@utils/helper/index";
import { db } from "./seed";
import { assertUniqueId, clone, nextId, round2 } from "./utils";

/**
 * The payment ledger: money in, per customer.
 *
 * Kept separate from orders on purpose. A bill says what was delivered; a
 * payment says what was handed over. On a round those are two different events
 * on two different days, and the whole "he'll clear it next delivery" pattern
 * only works if the system can hold them apart.
 */
export const paymentsMock = {
  /** Newest first, optionally for one customer. */
  list(customerId?: string): Payment[] {
    const rows = customerId
      ? db.payments.filter((p) => p.customerId === customerId)
      : db.payments;
    return clone(rows);
  },

  /** What was handed over at one particular delivery. */
  forOrder(orderId: string): Payment[] {
    return clone(db.payments.filter((p) => p.orderId === orderId));
  },

  /** Everything this customer has ever paid. */
  paidTotal(customerId: string): number {
    return round2(
      db.payments
        .filter((p) => p.customerId === customerId)
        .reduce((sum, p) => sum + p.amount, 0),
    );
  },

  create(draft: PaymentDraft): Payment {
    const customer = db.customers.find((c) => c.id === draft.customerId);
    if (!customer) throw new Error(`Customer ${draft.customerId} not found`);

    const amount = round2(draft.amount);
    // A zero payment is not a record of anything — "he paid nothing" is the
    // absence of a payment, and storing it would put empty rows on a statement.
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("A payment needs an amount above zero");
    }

    const id = nextId("PAY", db.payments);
    assertUniqueId("payments", id, db.payments);

    const created: Payment = {
      id,
      customerId: draft.customerId,
      ...(draft.orderId ? { orderId: draft.orderId } : {}),
      ...(draft.appliesTo ? { appliesTo: draft.appliesTo } : {}),
      amount,
      date: formatTimestamp(new Date()),
      receivedBy: draft.receivedBy.trim() || "Admin",
    };

    db.payments.unshift(created);
    return clone(created);
  },

  /** Undo a mis-keyed collection. The balance follows automatically. */
  remove(id: string): string {
    const index = db.payments.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Payment ${id} not found`);
    db.payments.splice(index, 1);
    return id;
  },
};
