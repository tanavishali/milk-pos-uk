import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

/**
 * A catalogue item.
 *
 * Prices are stored as **integer pence**, which is why the fields are named
 * `…Minor`: the name is the reminder that `2450` is £24.50 and not £2450. The
 * API converts at the DTO boundary, so callers still see decimals.
 */
@Schema({ collection: 'products', timestamps: true })
export class Product {
  /** Human-readable id, `PROD-101`. Printed in the UI, so it is not the `_id`. */
  @Prop({ required: true, unique: true, index: true })
  code!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  /** The category *name*, copied in rather than referenced — see Category. */
  @Prop({ required: true, trim: true, index: true })
  category!: string;

  /** List price, shown struck through. Integer pence. */
  @Prop({ required: true, min: 0 })
  retailPriceMinor!: number;

  /** The price actually charged. Integer pence. */
  @Prop({ required: true, min: 0 })
  salePriceMinor!: number;

  @Prop({ required: true, min: 0, default: 0 })
  quantity!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
