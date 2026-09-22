import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

/**
 * A catalogue item.
 *
 * The price is stored as **integer pence**, which is why the field is named
 * `…Minor`: the name is the reminder that `2450` is £24.50 and not £2450. The
 * API converts at the DTO boundary, so callers still see decimals.
 *
 * **One price.** A round sells at the price on the round, so there is no second
 * "list" price to keep true for nobody's benefit.
 */
@Schema({ collection: 'products', timestamps: true })
export class Product {
  /** Human-readable id, `PROD-101`. Printed in the UI, so it is not the `_id`. */
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  /** The category *name*, copied in rather than referenced — see Category. */
  @Prop({ required: true, trim: true, index: true })
  category!: string;

  /** The price charged. Integer pence. */
  @Prop({ required: true, min: 0 })
  salePriceMinor!: number;

  @Prop({ required: true, min: 0, default: 0 })
  quantity!: number;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ createdAt: -1 });
