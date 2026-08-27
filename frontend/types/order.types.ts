import type { PaymentType, Weekday } from "@enums/index";

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
  /**
   * The delivery day this line goes out on, for a customer on a round who wants
   * different goods on different days — milk on Monday, fruit on Thursday.
   *
   * Absent for a one-off sale to someone with no round, which is why it is
   * optional rather than defaulted: "no particular day" and "Monday" are
   * different facts and a default would erase the distinction.
   */
  day?: Weekday;
}

/** The customer as they were when the order was issued, copied not referenced. */
export interface OrderCustomer {
  name: string;
  phone: string;
  address: string;
  /** Copied with the address — a delivery address without it is half an address. */
  postcode: string;
  /**
   * The round the customer was on when the order was issued.
   *
   * Copied rather than looked up: moving a customer to a different round must
   * not silently rewrite which round last week's orders belonged to.
   */
  round: string;
}

export interface Order {
  id: string;
  /**
   * Who it was sold to. The customer is *copied* onto the order for display, but
   * the id is kept as well so earlier bills can be found — matching on a name
   * would break the moment a customer is renamed.
   */
  customerId: string;
  /** `YYYY-MM-DD HH:mm`, matching what the receipt prints. */
  date: string;
  customer: OrderCustomer;
  /**
   * Who delivers it. `courier` is the name printed on the receipt; `courierId`
   * is what a driver's own order list is scoped by — two couriers can share a
   * name, and scoping by name would show one driver another's deliveries.
   */
  courier: string;
  courierId: string;
  items: OrderLine[];
  paymentType: PaymentType;
  /** The goods on this order. Excludes anything carried forward. */
  total: number;
  /**
   * Unpaid balance rolled in from this customer's earlier bills, at the moment
   * this one was issued. Zero when there was nothing outstanding.
   */
  previousBalance: number;
  /** `total + previousBalance` — the figure actually due on this receipt. */
  grandTotal: number;
  /**
   * Set when another order absorbed this one's balance. An order is only
   * outstanding while it is `OnCredit` *and* unset — without this, rolling a
   * debt forward would bill it again on the next visit.
   */
  settledBy?: string;
}

export interface OrderDraft {
  customerId: string;
  /**
   * Roll this customer's outstanding balance into the new bill. The amount is
   * computed server-side from their unsettled orders — a client-supplied figure
   * would let the till decide what someone owes.
   */
  includePrevious: boolean;
  /** The chosen courier's id; the name is resolved from it server-side. */
  courierId: string;
  paymentType: PaymentType;
  items: OrderLine[];
}
