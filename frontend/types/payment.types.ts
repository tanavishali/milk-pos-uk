/**
 * Money received from a customer.
 *
 * A payment is its own record, not a flag on an order, because on a delivery
 * round the two happen at different times and in different amounts: the bill is
 * raised before the van leaves, the cash arrives at the door — sometimes all of
 * it, sometimes part, sometimes only what was owed from last week, sometimes
 * nothing at all. A boolean on the order cannot express any of that.
 */
export interface Payment {
  id: string;
  /** Whose money it is. Everything about a balance is scoped by this. */
  customerId: string;
  /**
   * The delivery it was handed over at, when it was handed over at one.
   *
   * This is *where the cash came in*, not which bill it settles — those differ
   * every time a customer pays last week's bill at this week's door. Which bills
   * it clears is worked out by allocation, oldest first.
   */
  orderId?: string;
  /**
   * The bill this money is *for*, when someone said so.
   *
   * Normally left off, and then it clears the oldest debt first — which is what
   * a customer means when they hand over cash at the door without naming a bill.
   * It is set when the operator states the intent: marking this week's bill paid
   * while last week's stays open must not silently pay off last week instead.
   */
  appliesTo?: string;
  amount: number;
  /** `YYYY-MM-DD HH:mm`, same format the receipt prints. */
  date: string;
  /** The courier who took it, or "Admin" when recorded at the terminal. */
  receivedBy: string;
}

export interface PaymentDraft {
  customerId: string;
  orderId?: string;
  appliesTo?: string;
  amount: number;
  receivedBy: string;
}
