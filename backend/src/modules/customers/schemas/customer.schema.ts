import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Weekday } from '../../../common/enums';

export type CustomerDocument = HydratedDocument<Customer>;

@Schema({ collection: 'customers', timestamps: true })
export class Customer {
  /** Human-readable id, `CUST-101`. Printed in the UI, so it is not the `_id`. */
  @Prop({ required: true, unique: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  /**
   * Id of the named round, or empty for a walk-in.
   *
   * Not a reference: the rounds are a fixed list served by `/delivery/rounds`,
   * and an id is what the customer form submits.
   */
  @Prop({ required: false, default: '', trim: true, index: true })
  round!: string;

  /**
   * The days actually delivered. Filled from the round when one is chosen but
   * **stored separately**, so a one-off variation does not require inventing a
   * new round.
   */
  @Prop({ type: [String], enum: Object.values(Weekday), default: [] })
  deliveryDays!: Weekday[];

  @Prop({ required: true, trim: true, lowercase: true })
  email!: string;

  /**
   * The delivery patch, stored beside the address rather than parsed out of
   * it — a round is planned by area, and "second turning past the mosque" is a
   * perfectly good address no parser will yield an area from.
   */
  @Prop({ required: true, trim: true, index: true })
  area!: string;

  @Prop({ required: true, trim: true })
  address!: string;

  @Prop({ required: true, trim: true })
  postcode!: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);
