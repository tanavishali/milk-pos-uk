import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

/**
 * A catalogue category.
 *
 * The **name is the key** — products carry `category` as a string, not as a
 * reference. That is inherited from the frontend, and it is why this collection
 * exists at all: without it a category could not be created before the first
 * product used it, and the "Add Item Category" modal does exactly that.
 */
@Schema({ collection: 'categories', timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, trim: true, index: true })
  name!: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
