import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, type ClientSession } from 'mongoose';
import { RoundBookStatus } from '../../common/enums';
import { SequenceService } from '../../database/sequence.service';
import { DELIVERY_ROUNDS } from '../delivery/delivery.constants';
import { LedgerService, type LedgerBill } from '../orders/ledger.service';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { PaymentsService } from '../payments/payments.service';
import {
  CloseRoundBookResultDto,
  RoundBookDto,
  type RolledForwardDto,
} from './dto/round-book.dto';
import {
  addDays,
  closureWarnings,
  nextWeekStart,
  summarizeBook,
  type BookBill,
  type BookStatement,
  type BookSummary,
} from './round-book.summary';
import { RoundBook, RoundBookDocument } from './schemas/round-book.schema';

/** The projection a book's summary reads off a bill. */
type BookBillRow = Pick<
  Order,
  'code' | 'customerId' | 'courierId' | 'deliveryDate' | 'totalMinor' | 'createdAt'
> & { customer: { name: string } };

type LedgerBillRow = LedgerBill & { customerId: string };

/**
 * Raises next week's bills from the book just closed, inside the closing
 * transaction.
 *
 * Passed in rather than called directly because raising a bill is
 * `OrdersService`'s job, and `OrdersModule` already imports this one — a
 * direct call back would be a dependency cycle.
 */
export type RollForward = (
  closed: RoundBook,
  next: RoundBook,
  session: ClientSession,
) => Promise<RolledForwardDto>;

/** How far back a round's history goes in one read — a year of weeks. */
const HISTORY_LIMIT = 52;

const EUR = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
const formatMinor = (minor: number) => EUR.format(minor / 100);

/**
 * Round books: one open week per round, closed by the operator.
 *
 * Closing a book is the counterpart of mymilkman's "Close Round Book":
 *
 * 1. the book's figures and one statement per customer are **frozen** onto it,
 * 2. it is marked closed and can never be written again,
 * 3. the next week's book is opened for the same round,
 * 4. every customer billed this week gets the same bills again in next week's
 *    book (see `OrdersService.rollForward`), each carrying what they still owe
 *    as its previous balance.
 *
 * No existing bill or payment is changed. Every balance is derived from the
 * ledger on read, so the unpaid money is still on the customer's account and
 * the new bill simply prints it as `previousBalance`. The frozen statements
 * are a record of how the week stood that later payments cannot rewrite.
 */
@Injectable()
export class RoundBooksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoundBooksService.name);

  constructor(
    @InjectModel(RoundBook.name)
    private readonly books: Model<RoundBookDocument>,
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly sequence: SequenceService,
    private readonly payments: PaymentsService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Give every round an open book, and every bill on a round a book, at boot —
   * before any screen can ask.
   *
   * Left to the first request instead, the stamping would happen *after* the
   * order registry had already loaded those bills without a book code, and the
   * screen would show a book with orders in it above a table that could not
   * find them.
   *
   * After the first boot this is two indexed reads and a no-op update per
   * round. Not awaited by the boot itself, and failures are logged rather than
   * thrown: the connection is lazy, and `openBook` still runs on demand for
   * any round this missed.
   */
  onApplicationBootstrap(): void {
    void this.prepareRounds();
  }

  /**
   * One round at a time, after lifting the counter.
   *
   * `SequenceService.next` offsets a brand-new counter to `startAt + 1` only
   * for the call that *created* it; five rounds asking at once on a fresh
   * database would get `RB-101`, then `RB-2` to `RB-5`. Setting the floor
   * first and opening the rounds in turn keeps every code in the same shape.
   */
  private async prepareRounds(): Promise<void> {
    try {
      await this.sequence.ensureAtLeast('RB', 100);
    } catch (error) {
      this.logger.warn(`Could not prepare the RB counter: ${describe(error)}`);
      return;
    }

    for (const round of DELIVERY_ROUNDS) {
      try {
        await this.openBook(round.id);
        await this.claimUnbooked(round.id);
      } catch (error) {
        this.logger.warn(`Could not prepare the book for ${round.id}: ${describe(error)}`);
      }
    }
  }

  /**
   * Put a round's bills that carry no book into its **oldest** book.
   *
   * Every bill raised through `OrdersService.create` is stamped, so the only
   * unbooked bills on a round are ones that predate books or were written
   * around the API — a seed, an import. The oldest book is the honest home
   * for history like that; the current week is not, and would put last
   * month's bills on this week's statements.
   */
  private async claimUnbooked(roundId: string): Promise<void> {
    const oldest = await this.books
      .findOne({ roundId })
      .sort({ weekStart: 1, createdAt: 1 })
      .lean<RoundBook>();
    if (!oldest) return;

    const { modifiedCount } = await this.orders.updateMany(
      { 'customer.round': roundId, roundBook: { $exists: false } },
      { $set: { roundBook: oldest.code } },
    );

    if (modifiedCount > 0) {
      this.logger.log(`Filed ${modifiedCount} earlier bill(s) on ${roundId} into ${oldest.code}.`);
    }
  }

  private roundOrThrow(roundId: string) {
    const round = DELIVERY_ROUNDS.find((r) => r.id === roundId);
    if (!round) throw new BadRequestException(`Unknown round "${roundId}".`);
    return round;
  }

  /**
   * The round's open book, opening the first one if it has none.
   *
   * Called with a session by `OrdersService.create`, inside the transaction
   * that raises the bill. In that case the book is read with a write (see
   * `RoundBook.revision`) so a close running at the same moment conflicts with
   * the bill instead of freezing statements that miss it.
   *
   * Returns `null` for anything that is not a named round: a walk-in's bill
   * belongs to no book, and an unknown id is not worth failing a sale over.
   */
  async openBook(
    roundId: string,
    session?: ClientSession,
  ): Promise<RoundBook | null> {
    const round = DELIVERY_ROUNDS.find((r) => r.id === roundId);
    if (!round) return null;

    const filter = { roundId, status: RoundBookStatus.Open };

    const existing = session
      ? await this.books
          .findOneAndUpdate(filter, { $inc: { revision: 1 } }, { new: true, session })
          .lean<RoundBook>()
      : await this.books.findOne(filter).lean<RoundBook>();

    if (existing) return existing;

    const latest = await this.books
      .findOne({ roundId })
      .sort({ weekStart: -1 })
      .session(session ?? null)
      .lean<RoundBook>();

    const code = await this.sequence.next('RB');

    try {
      const [created] = await this.books.create(
        [
          {
            code,
            roundId,
            roundLabel: round.label,
            weekStart: nextWeekStart(latest?.weekStart, new Date()),
            status: RoundBookStatus.Open,
          },
        ],
        { session },
      );

      /**
       * The very first book a round ever gets takes the bills raised before
       * books existed. Without this they would belong to no week at all and
       * could never appear on a statement.
       */
      if (!latest) {
        await this.orders.updateMany(
          { 'customer.round': roundId, roundBook: { $exists: false } },
          { $set: { roundBook: code } },
          { session },
        );
      }

      return created!.toObject();
    } catch (error) {
      /**
       * Another request opened the book between our read and our insert, and
       * the partial unique index refused the second one. Outside a transaction
       * the winner can simply be read back; inside one the error has to
       * propagate so the driver retries the whole transaction.
       */
      if (!session && isDuplicateKey(error)) {
        const winner = await this.books.findOne(filter).lean<RoundBook>();
        if (winner) return winner;
      }
      throw error;
    }
  }

  /**
   * A book's figures, worked out from the ledger.
   *
   * **Five reads, whatever the size of the book.** The allocation has to run
   * over each customer's whole history — money paid against an older debt
   * must not be counted as settling this week's bill — so every bill of every
   * customer on the book is fetched in one query, and the payment side comes
   * in two bulk reads, the same shape as `OrdersService.decorate`.
   */
  private async compute(code: string, weekStart: string): Promise<{
    summary: BookSummary;
    statements: BookStatement[];
    warnings: string[];
  }> {
    const rows = await this.orders
      .find({ roundBook: code })
      .select('code customerId customer.name courierId deliveryDate totalMinor createdAt')
      .lean<BookBillRow[]>();

    const bills: BookBill[] = rows.map((row) => ({
      code: row.code,
      customerId: row.customerId,
      customerName: row.customer.name,
      courierId: row.courierId,
      deliveryDate: row.deliveryDate,
      totalMinor: row.totalMinor,
      createdAt: row.createdAt,
    }));

    const customerIds = [...new Set(bills.map((bill) => bill.customerId))];

    const [allBills, paymentsByCustomer, paidByCustomer] = customerIds.length
      ? await Promise.all([
          this.orders
            .find({ customerId: { $in: customerIds } })
            .select('code customerId totalMinor createdAt')
            .lean<LedgerBillRow[]>(),
          this.payments.ledgerRowsForMany(customerIds),
          this.payments.paidTotalsByCustomer(customerIds),
        ])
      : [[], new Map(), new Map()];

    const billsByCustomer = new Map<string, LedgerBillRow[]>();
    for (const bill of allBills) {
      const list = billsByCustomer.get(bill.customerId);
      if (list) list.push(bill);
      else billsByCustomer.set(bill.customerId, [bill]);
    }

    const covered = new Map<string, number>();
    const balances = new Map<string, number>();

    for (const customerId of customerIds) {
      const history = billsByCustomer.get(customerId) ?? [];
      const allocation = this.ledger.allocate(
        paymentsByCustomer.get(customerId) ?? [],
        history,
      );
      for (const [billCode, pence] of allocation) covered.set(billCode, pence);
      balances.set(
        customerId,
        this.ledger.balanceMinor(history, paidByCustomer.get(customerId) ?? 0),
      );
    }

    const { summary, statements } = summarizeBook(bills, covered, balances);

    return {
      summary,
      statements,
      warnings: closureWarnings(bills, summary, addDays(weekStart, 6), formatMinor),
    };
  }

  /** The open book for a round, with live figures and the pre-close checklist. */
  async current(roundId: string): Promise<RoundBookDto> {
    this.roundOrThrow(roundId);
    const book = (await this.openBook(roundId))!;
    return RoundBookDto.from(book, await this.compute(book.code, book.weekStart));
  }

  /** A round's books, newest week first. Statements are left out of a list. */
  async history(roundId: string): Promise<RoundBookDto[]> {
    this.roundOrThrow(roundId);

    const books = await this.books
      .find({ roundId })
      .sort({ weekStart: -1, createdAt: -1 })
      .limit(HISTORY_LIMIT)
      .select('-statements')
      .lean<RoundBook[]>();

    return Promise.all(
      books.map(async (book) => {
        if (book.status === RoundBookStatus.Closed) return RoundBookDto.from(book);
        /** The one open book has no stored figures to show, so compute them. */
        const { summary } = await this.compute(book.code, book.weekStart);
        return RoundBookDto.from(book, { summary });
      }),
    );
  }

  async findOne(code: string): Promise<RoundBookDto> {
    const book = await this.books.findOne({ code }).lean<RoundBook>();
    if (!book) throw new NotFoundException(`Round book ${code} not found.`);

    if (book.status === RoundBookStatus.Closed) return RoundBookDto.from(book);
    return RoundBookDto.from(book, await this.compute(book.code, book.weekStart));
  }

  /**
   * Close a book, open the next one, and raise next week's bills in it — one
   * transaction, so a round is never left with no open book, with two, or
   * with only some of its customers billed for the coming week.
   *
   * The figures are computed *inside* the transaction and the book is flipped
   * with a conditional update on `status: open`. Two operators pressing Close
   * together therefore close it once: the second finds nothing to update and
   * gets a 409, rather than a second next-week book.
   */
  async close(
    code: string,
    closedBy: string,
    rollForward?: RollForward,
  ): Promise<CloseRoundBookResultDto> {
    const session = await this.connection.startSession();

    try {
      let result!: CloseRoundBookResultDto;

      await session.withTransaction(async () => {
        const book = await this.books
          .findOne({ code })
          .session(session)
          .lean<RoundBook>();

        if (!book) throw new NotFoundException(`Round book ${code} not found.`);
        if (book.status === RoundBookStatus.Closed) {
          throw new ConflictException(`Round book ${code} is already closed.`);
        }

        const { summary, statements } = await this.compute(book.code, book.weekStart);
        const closedAt = new Date();

        const closed = await this.books
          .findOneAndUpdate(
            { code, status: RoundBookStatus.Open },
            {
              $set: {
                status: RoundBookStatus.Closed,
                closedAt,
                closedBy,
                summary,
                statements,
              },
              $inc: { revision: 1 },
            },
            { new: true, session },
          )
          .lean<RoundBook>();

        if (!closed) {
          throw new ConflictException(`Round book ${code} is already closed.`);
        }

        const [next] = await this.books.create(
          [
            {
              code: await this.sequence.next('RB'),
              roundId: book.roundId,
              roundLabel: book.roundLabel,
              weekStart: nextWeekStart(book.weekStart, closedAt),
              status: RoundBookStatus.Open,
            },
          ],
          { session },
        );

        const opened = next!.toObject() as RoundBook;

        /**
         * Next week's bills, raised in this same transaction. If any of them
         * fails the close fails with it: a closed book with half its customers
         * rolled forward would leave the operator no way to finish the job,
         * since the book cannot be closed a second time.
         */
        const rolledForward = rollForward
          ? await rollForward(closed, opened, session)
          : { created: [], skipped: [] };

        result = {
          closed: RoundBookDto.from(closed),
          next: RoundBookDto.from(opened),
          rolledForward,
        };
      });

      return result;
    } finally {
      await session.endSession();
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}
