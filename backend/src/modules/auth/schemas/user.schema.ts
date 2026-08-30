import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../common/enums';

export type UserDocument = HydratedDocument<User>;

/**
 * A sign-in account. One collection for both roles — the role is a field, not
 * a separate collection, because login has to resolve an email to an account
 * before it knows which kind it is.
 *
 * The courier *roster* row stays in the `couriers` collection; this holds only
 * what authentication needs, joined by `courierId`. That split is deliberate
 * and inherited from the frontend mock, where passwords live in their own store
 * precisely so a password can never ride along on a courier read.
 */
@Schema({ collection: 'users', timestamps: true })
export class User {
  /** Stored lower-cased and trimmed so sign-in is case-insensitive. */
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  /**
   * bcrypt hash, never the password.
   *
   * `select: false` means it is absent from every query result unless asked
   * for explicitly — the one place that does is the credential check.
   */
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  /** Display label under the name. Never used for authorisation — that is `role`. */
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, enum: Object.values(UserRole), index: true })
  role!: UserRole;

  /** Present only for a courier: the roster id their deliveries are scoped to. */
  @Prop({ required: false, default: undefined })
  courierId?: string;

  /** Present only for an admin: which till they are signed in at. */
  @Prop({ required: false, default: undefined })
  terminalId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
