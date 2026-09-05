import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Weekday } from '../../../common/enums';

export type OrderDocument = HydratedDocument<Order>;

/** The customer as they were when the order was issued — copied, not referenced. */
@Schema({ _id: false })
export class OrderCustomer {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) phone!: string;
  @Prop({ required: true }) address!: string;
  @Prop({ required: true }) area!: string;
  @Prop({ required: true }) postcode!: string;

  /**
   * The round they were on that day. Copied rather than looked up: moving a
   * customer to a different round must not rewrite which round last week's
   * orders belonged to.
   *
   * **Not `required`.** Mongoose treats `''` as absent for a required string,
   * and a walk-in genuinely has no round — marking it required rejects exactly
   * the customer the empty string exists to describe.
   */
  @Prop({ default: '' }) round!: string;
}

export const OrderCustomerSchema = SchemaFactory.createForClass(OrderCustomer);

@Schema({ _id: false })
export class OrderLine {
  @Prop({ required: true }) productId!: string;

  /** Copied, so a renamed product does not rewrite a printed receipt. */
  @Prop({ required: true }) name!: string;

  @Prop({ required: true, min: 1 }) qty!: number;

  /** The price **actually charged**, in pence — the cashier may have overridden it. */
  @Prop({ required: true, min: 0 }) priceMinor!: number;

  /**
   * The delivery day this line goes out on. Absent for a one-off sale to
   * someone with no round: "no particular day" and "Monday" are different
   * facts, and defaulting would erase the distinction.
   */
  @Prop({ required: false, enum: Object.values(Weekday), default: undefined })
  day?: Weekday;
}

export const OrderLineSchema = SchemaFactory.createForClass(OrderLine);

/**
 * A bill: what was delivered, to whom, by whom.
 *
 * **The payment fields are deliberately absent.** `settledAmount`, `status`,
 * `receivedAtDelivery` and `customerBalance` are worked out from the ledger on
 * every read — see `LedgerService`.
 */
@Schema({ collection: 'orders', timestamps: true })
export class Order {
  /** Human-readable id, `TRX-8901`. Printed on the receipt. */
  @Prop({ required: true, unique: true, index: true })
  code!: string;

  /** `YYYY-MM-DD HH:mm`, matching what the receipt prints. */
  @Prop({ required: true })
  date!: string;

  /**
   * The day this is to be delivered, `YYYY-MM-DD`, chosen by whoever raised the
   * bill. Distinct from `date`: an order taken on Friday for Monday's round is
   * a real and common case, and one field cannot answer both "when was this
   * sold" and "when does it go out".
   *
   * Optional because orders raised before this field existed do not have one,
   * and a required prop would make every one of them unreadable.
   */
  @Prop({ required: false })
  deliveryDate?: string;

  /** Kept alongside the copy, so earlier bills can still be found after a rename. */
  @Prop({ required: true, index: true })
  customerId!: string;

  @Prop({ type: OrderCustomerSchema, required: true })
  customer!: OrderCustomer;

  /** The name printed on the receipt. */
  @Prop({ required: true, default: 'Unassigned' })
  courier!: string;

  /**
   * What a driver's own list is scoped by — two couriers can share a name.
   *
   * Not `required`, for the same reason as `customer.round`: an unassigned
   * order carries `''`, which a required string would reject.
   */
  @Prop({ default: '', index: true })
  courierId!: string;

  @Prop({ type: [OrderLineSchema], required: true })
  items!: OrderLine[];

  /** Delivery fee charged for this trip, in pence. Included in the order total. */
  @Prop({ required: false, min: 0, default: 0 })
  deliveryChargeMinor?: number;

  /** The goods on **this** delivery, in pence. The only figure that adds to a debt. */
  @Prop({ required: true, min: 0 })
  totalMinor!: number;

  /**
   * What the customer already owed when this bill was raised — a snapshot for
   * the docket. **Not a debt of its own**; the earlier bills still carry it.
   */
  @Prop({ required: true, min: 0 })
  previousBalanceMinor!: number;

  /** `total + previousBalance` — what the driver asks for at this door. */
  @Prop({ required: true, min: 0 })
  grandTotalMinor!: number;

  /**
   * Set by `timestamps: true`. Declared so the ledger can sort on it — being
   * able to order bills oldest-first is not optional here.
   */
  createdAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
