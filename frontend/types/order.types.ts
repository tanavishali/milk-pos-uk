import type { PaymentStatus, Weekday } from "@enums/index";

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
  /** The delivery area, copied for the same reason as the address. */
  area: string;
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
  /** The goods on this delivery. This is the only figure that adds to a debt. */
  total: number;
  /**
   * What the customer already owed when this bill was raised — a snapshot for
   * the docket, printed as it stood that day. It is *not* part of this bill's
   * debt; the earlier bills still carry that themselves, which is what stops
   * the same money being counted twice.
   */
  previousBalance: number;
  /** `total + previousBalance` — what the driver asks for at this door. */
  grandTotal: number;

  // ── Computed on read from the payment ledger, never stored ───────────────

  /**
   * How much of this bill's own `total` the ledger covers, with payments
   * applied oldest bill first. That ordering is what makes "he paid last
   * week's, not this week's" come out right without anyone having to say which
   * bill they meant.
   */
  settledAmount: number;
  status: PaymentStatus;
  /**
   * Cash handed over *at this delivery* — the sum of payments tagged with this
   * order. Distinct from `settledAmount`: money taken at Saturday's door can
   * settle Monday's bill.
   */
  receivedAtDelivery: number;
  /** Everything this customer owes right now, across all their bills. */
  customerBalance: number;
}

export interface OrderDraft {
  customerId: string;
  /** The chosen courier's id; the name is resolved from it server-side. */
  courierId: string;
  items: OrderLine[];
}
