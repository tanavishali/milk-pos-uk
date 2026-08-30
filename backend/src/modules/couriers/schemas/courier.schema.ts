import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CourierDocument = HydratedDocument<Courier>;

/**
 * A driver on the dispatch roster.
 *
 * **No password field, deliberately.** The credential lives on the `users`
 * document keyed by `courierId`, so it cannot ride along on a read of this
 * collection — the same separation the frontend mock kept, for the same reason.
 */
@Schema({ collection: 'couriers', timestamps: true })
export class Courier {
  /** Human-readable id, `COUR-101`. Orders scope a driver's list by it. */
  @Prop({ required: true, unique: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ required: true, trim: true })
  phone!: string;

  /** National ID card number. */
  @Prop({ required: true, trim: true })
  idcard!: string;

  /** Also the sign-in email for this courier's account, when they have one. */
  @Prop({ required: true, trim: true, lowercase: true, index: true })
  email!: string;

  /**
   * The patch this courier covers — a different question from `address`, which
   * is where they live. Dispatch needs the first, and it is not recoverable
   * from the second.
   */
  @Prop({ required: true, trim: true, index: true })
  area!: string;

  @Prop({ required: true, trim: true })
  address!: string;
}

export const CourierSchema = SchemaFactory.createForClass(Courier);
