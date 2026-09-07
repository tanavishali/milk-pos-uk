import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { UserRole } from '../../../common/enums';

export type AuditLogDocument = HydratedDocument<AuditLog>;

/**
 * One record of one thing somebody changed.
 *
 * Written for every mutating request, whether it succeeded or not. A trail that
 * only records successes cannot answer the question it exists for — "who tried
 * to delete that payment" is exactly as interesting as who managed it.
 *
 * Deliberately **append-only in practice**: nothing in the application updates
 * or deletes a row here, and there is no endpoint that exposes one. An audit
 * trail the application can rewrite is not evidence of anything.
 */
@Schema({
  collection: 'audit_logs',
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class AuditLog {
  /** Account id from the verified token, or `anonymous` for a failed sign-in. */
  @Prop({ required: true, index: true })
  actorId!: string;

  /**
   * Copied, not referenced.
   *
   * The point of an audit row is that it still reads correctly in a year. A
   * join to `users` would render as a blank once that account is deleted —
   * precisely when the trail matters most.
   */
  @Prop({ required: true })
  actorEmail!: string;

  @Prop({ type: String, required: false, enum: Object.values(UserRole) })
  actorRole?: UserRole;

  /** `create`, `update`, `delete` — derived from the HTTP method. */
  @Prop({ required: true })
  action!: string;

  /** The registry touched: `orders`, `payments`, `customers`, … */
  @Prop({ required: true, index: true })
  resource!: string;

  /** The row's human-readable code, where the request named or produced one. */
  @Prop({ required: false, default: undefined })
  resourceId?: string;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  statusCode!: number;

  /** Address the change came from, as resolved through the trusted proxy hops. */
  @Prop({ required: false, default: '' })
  ip!: string;

  @Prop({ required: false, default: '' })
  userAgent!: string;

  /** How long the handler took. A slow delete is worth being able to see. */
  @Prop({ required: false, default: 0 })
  durationMs!: number;

  /**
   * The request body, with anything sensitive replaced before it is stored.
   *
   * Redaction happens on the way in rather than on the way out: a password
   * that reached this collection would be a password in a backup, and no
   * amount of care at read time undoes that.
   */
  @Prop({ type: Object, required: false, default: undefined })
  payload?: Record<string, unknown>;

  /** The failure, when the request failed. Absent on success. */
  @Prop({ required: false, default: undefined })
  error?: string;

  createdAt!: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

/**
 * The two questions actually asked of a trail: "what happened recently" and
 * "what has ever been done to this row".
 *
 * No TTL index. Audit rows are the one collection here that should outlive the
 * data they describe, so nothing expires them automatically — pruning is a
 * retention decision for whoever runs the deployment, not a default.
 */
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
