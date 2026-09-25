import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RoundBookStatus } from '../../../common/enums';

export type RoundBookDocument = HydratedDocument<RoundBook>;

/** The book's totals, in pence. Frozen onto the record when it closes. */
@Schema({ _id: false })
export class RoundBookSummary {
  @Prop({ required: true, min: 0 }) orderCount!: number;
  @Prop({ required: true, min: 0 }) customerCount!: number;

  /** Goods on this book's bills — `totalMinor`, never `grandTotalMinor`. */
  @Prop({ required: true, min: 0 }) billedMinor!: number;

  /** How much of *this book's* bills the ledger covers. */
  @Prop({ required: true, min: 0 }) settledMinor!: number;

  /** `billed - settled`: what this week's bills still have open. */
  @Prop({ required: true, min: 0 }) outstandingMinor!: number;

  /**
   * What the customers on this book owe in total, across every bill they have
   * — the figure that rolls into next week. Can exceed `outstanding`, because
   * an older book's debt is still theirs.
   */
  @Prop({ required: true, min: 0 }) carriedForwardMinor!: number;
}

export const RoundBookSummarySchema =
  SchemaFactory.createForClass(RoundBookSummary);

/** One customer's line on the closed book — the statement they are sent. */
@Schema({ _id: false })
export class RoundBookStatement {
  @Prop({ required: true }) customerId!: string;

  /** As copied onto their most recent bill in this book. */
  @Prop({ required: true }) name!: string;

  @Prop({ required: true, min: 0 }) orderCount!: number;
  @Prop({ required: true, min: 0 }) billedMinor!: number;
  @Prop({ required: true, min: 0 }) settledMinor!: number;

  /**
   * Their whole account at the moment of closing. Negative is a credit — kept
   * signed, because a statement that printed a credit as zero would be lying.
   */
  @Prop({ required: true }) balanceMinor!: number;
}

export const RoundBookStatementSchema =
  SchemaFactory.createForClass(RoundBookStatement);

/**
 * One round's week of deliveries.
 *
 * Every round has exactly one **open** book at a time. A bill raised for a
 * customer on that round is stamped with the open book's code; closing the book
 * freezes its statements and opens the next one, so the following bill lands
 * in next week's book without anybody choosing it.
 *
 * The book is assigned when the bill is raised, not worked out later from its
 * dates. `date` and `deliveryDate` can both disagree with the week a bill was
 * actually run in — an order taken on Sunday for Monday is the ordinary case —
 * and a book's contents must not change because a date was read differently.
 */
@Schema({ collection: 'round_books', timestamps: true })
export class RoundBook {
  /** Human-readable id, `RB-101`. */
  @Prop({ required: true, unique: true })
  code!: string;

  /** An id from `DELIVERY_ROUNDS`. */
  @Prop({ required: true })
  roundId!: string;

  /** Copied, so renaming a round does not rewrite a closed book's heading. */
  @Prop({ required: true })
  roundLabel!: string;

  /** The Monday this book's week starts on, `YYYY-MM-DD`. */
  @Prop({ required: true })
  weekStart!: string;

  @Prop({
    type: String,
    required: true,
    enum: Object.values(RoundBookStatus),
    default: RoundBookStatus.Open,
  })
  status!: RoundBookStatus;

  @Prop({ required: false, default: undefined })
  closedAt?: Date;

  /** The email of whoever closed it, taken from their token. */
  @Prop({ required: false, default: undefined })
  closedBy?: string;

  /** Absent while open — an open book's figures are computed on every read. */
  @Prop({ type: RoundBookSummarySchema, required: false, default: undefined })
  summary?: RoundBookSummary;

  @Prop({ type: [RoundBookStatementSchema], default: undefined })
  statements?: RoundBookStatement[];

  /**
   * Bumped by every write that depends on the book still being open — each
   * bill stamped with it, and the close itself.
   *
   * It exists to make those writes collide. Raising a bill only *reads* the
   * book otherwise, and a read does not conflict with a concurrent close under
   * snapshot isolation: the bill would commit into a book whose statements had
   * just been frozen without it. Writing the same document turns that race into
   * a write conflict, which the driver retries, and the retry finds next week's
   * book instead.
   */
  @Prop({ required: true, default: 0 })
  revision!: number;

  createdAt!: Date;
}

export const RoundBookSchema = SchemaFactory.createForClass(RoundBook);

/**
 * **At most one open book per round**, enforced by the database.
 *
 * Two tills raising the first bill of the week at the same moment would each
 * find no open book and each create one; the second insert fails here instead,
 * and the service re-reads the winner. Without this the round would have two
 * current weeks and the orders would be split between them.
 */
RoundBookSchema.index(
  { roundId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: RoundBookStatus.Open },
    name: 'one_open_book_per_round',
  },
);

/** A round's history, newest week first. */
RoundBookSchema.index({ roundId: 1, weekStart: -1 });
