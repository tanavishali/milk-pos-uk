import type { Order } from "@app-types/index";

export type Category = string;

/**
 * An order as the store holds it: what was delivered, to whom, by whom.
 *
 * The payment fields are deliberately absent. They are worked out from the
 * ledger every time an order is read, so there is no stored copy that can drift
 * out of step with the money — and no migration to write when a payment lands.
 */
export type StoredOrder = Omit<
  Order,
  "settledAmount" | "status" | "receivedAtDelivery" | "customerBalance"
>;
