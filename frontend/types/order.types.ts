import type { PaymentType } from "@enums/index";

/**
 * A line on an issued order. `price` is the price actually charged, which the
 * cashier may have overridden in the wizard — the receipt shows this, never the
 * product's current `salePrice`, so a later price change can't rewrite history.
 */
export interface OrderLine {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

/** The customer as they were when the order was issued, copied not referenced. */
export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
}

export interface Order {
  id: string;
  /** `YYYY-MM-DD HH:mm`, matching what the receipt prints. */
  date: string;
  customer: OrderCustomer;
  courier: string;
  items: OrderLine[];
  paymentType: PaymentType;
  total: number;
}

export interface OrderDraft {
  customerId: string;
  courier: string;
  paymentType: PaymentType;
  items: OrderLine[];
}
