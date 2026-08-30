import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

/**
 * Money received from a customer.
 *
 * Its own record, never a flag on an order. On a delivery round the bill is
 * raised before the van leaves and the cash arrives at the door — sometimes all
 * of it, sometimes part, sometimes only last week's, sometimes nothing. A
 * boolean on the order cannot express any of that.
 */
@Schema({ collection: 'payments', timestamps: true })
export class Payment {
  /** Human-readable id, `PAY-101`. */
  @Prop({ required: true, unique: true, index: true })
  code!: string;

  /** Whose money it is. Every balance is scoped by this. */
  @Prop({ required: true, index: true })
  customerId!: string;

  /**
   * The delivery it was handed over at.
   *
   * *Where the cash came in* — not which bill it settles. Those differ every
   * time someone pays last week's bill at this week's door.
   */
  @Prop({ required: false, default: undefined, index: true })
  orderId?: string;

  /**
   * The bill this money is *for*, when the operator said so.
   *
   * Normally absent, and then it clears the oldest debt first. Set only when
   * intent was stated: marking this week paid while last week stays open must
   * not silently pay off last week instead.
   */
  @Prop({ required: false, default: undefined, index: true })
  appliesTo?: string;

  /** Integer pence. */
  @Prop({ required: true, min: 1 })
  amountMinor!: number;

  /** `YYYY-MM-DD HH:mm`, the format the receipt prints. */
  @Prop({ required: true })
  date!: string;

  /** The courier who took it, or "Admin" when recorded at the terminal. */
  @Prop({ required: true, trim: true })
  receivedBy!: string;

  /**
   * Set by `timestamps: true`. Declared because the ledger applies payments in
   * the order they were taken — this field is load-bearing, not incidental.
   */
  createdAt!: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
