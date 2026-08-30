import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

/** One row per id prefix, holding the highest number handed out so far. */
@Schema({ collection: 'counters', timestamps: false })
export class Counter {
  /** The prefix itself: `PROD`, `TRX`, `PAY`. */
  @Prop({ required: true, unique: true })
  _id!: string;

  @Prop({ required: true, default: 0 })
  value!: number;
}

export const CounterSchema = SchemaFactory.createForClass(Counter);
