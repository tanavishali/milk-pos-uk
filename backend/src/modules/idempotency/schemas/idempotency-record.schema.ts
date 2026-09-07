import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

export type IdempotencyRecordDocument = HydratedDocument<IdempotencyRecord>;

/** Where a keyed request has got to. */
export enum IdempotencyState {
  /** A handler is running for this key right now. */
  InFlight = 'in-flight',
  /** It finished, and `response` is what it produced. */
  Completed = 'completed',
}

/**
 * One remembered result, keyed by what the client called the attempt.
 *
 * The problem this solves is specific and expensive: a driver taps *Record
 * payment*, the phone loses signal before the response arrives, and they tap
 * again. Without a key the second tap is an entirely legitimate second
 * payment — the server has no way to tell a retry from a genuine repeat, and
 * the customer is credited twice.
 */
@Schema({
  collection: 'idempotency_records',
  timestamps: true,
  versionKey: false,
})
export class IdempotencyRecord {
  /**
   * The client's key, scoped to the account that sent it.
   *
   * Scoped, because keys are chosen by clients and two devices can pick the
   * same one. Unscoped, one driver's retry key could collide with another's
   * and return them somebody else's receipt.
   */
  @Prop({ required: true, unique: true })
  scopedKey!: string;

  @Prop({ required: true })
  actorId!: string;

  @Prop({ required: true })
  method!: string;

  @Prop({ required: true })
  path!: string;

  /**
   * Hash of the request body.
   *
   * The same key with a *different* body is not a retry — it is a client bug,
   * and answering it with the first call's response would hide a real problem
   * behind a plausible-looking receipt. Comparing hashes rather than bodies
   * keeps the record small and avoids storing a second copy of the payload.
   */
  @Prop({ required: true })
  requestHash!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(IdempotencyState),
  })
  state!: IdempotencyState;

  @Prop({ required: false, default: undefined })
  statusCode?: number;

  /** Exactly what the first call returned, replayed verbatim to a retry. */
  @Prop({ type: Object, required: false, default: undefined })
  response?: unknown;

  createdAt!: Date;
  updatedAt!: Date;
}

export const IdempotencyRecordSchema =
  SchemaFactory.createForClass(IdempotencyRecord);

/**
 * Records expire after 24 hours.
 *
 * A retry happens within seconds; a day is generous. The window matters in the
 * other direction too — keeping keys forever would mean a client that reuses a
 * key next month silently gets a stale receipt instead of a new sale, so the
 * TTL is a correctness bound, not just housekeeping.
 *
 * Mongo's TTL monitor runs about once a minute, so expiry is approximate. That
 * is fine here: the cost of a record living a minute longer than promised is
 * nothing.
 */
IdempotencyRecordSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 24 * 60 * 60 },
);
