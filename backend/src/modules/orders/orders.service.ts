import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, type ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PageDto } from '../../common/dto/page.dto';
import {
  PaginationQueryDto,
  resolvePaging,
} from '../../common/dto/pagination-query.dto';
import { PaymentStatus } from '../../common/enums';
import { toMinorUnits } from '../../common/utils/money';
import { SequenceService } from '../../database/sequence.service';
import { CouriersService } from '../couriers/couriers.service';
import { CustomersService } from '../customers/customers.service';
import { PaymentsService, formatTimestamp } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
import { DELIVERY_ROUNDS } from '../delivery/delivery.constants';
import type {
  RolledForwardBillDto,
  RolledForwardDto,
  RolledForwardSkipDto,
} from '../round-books/dto/round-book.dto';
import { addDays } from '../round-books/round-book.summary';
import type { RoundBook } from '../round-books/schemas/round-book.schema';
import { RoundBooksService } from '../round-books/round-books.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto, OutstandingDto } from './dto/order.dto';
import { LedgerService, type LedgerBill } from './ledger.service';
import { Order, OrderDocument } from './schemas/order.schema';

/**
 * An order as the read paths hand it over.
 *
 * `Order` rather than `OrderDocument`: every read here is `.lean()`, which
 * returns plain objects, and nothing downstream calls a document method. A
 * hydrated document still satisfies this shape, so `create` can pass one
 * straight through without a second fetch.
 */
type OrderLike = Order;

/** The ledger projection — four fields off a bill, not a whole one. */
type LedgerBillRow = LedgerBill & { customerId: string };

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orders: Model<OrderDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly sequence: SequenceService,
    private readonly ledger: LedgerService,
    private readonly payments: PaymentsService,
    private readonly customers: CustomersService,
    private readonly couriers: CouriersService,
    private readonly products: ProductsService,
    private readonly config: ConfigService,
    /** Last, so the positional test harnesses that build this service keep lining up. */
    private readonly roundBooks: RoundBooksService,
  ) {}

  /**
   * Attach the four ledger-derived fields.
   *
   * **Four reads, whatever the size of the page.** The allocation is per
   * customer and cannot be expressed as a query, so this used to loop over the
   * customers on the page and fetch each one's payments in turn: two round
   * trips per customer, awaited one after another, so a page covering two
   * hundred customers made four hundred serial trips before a byte went back.
   * Everything the loop needed is now fetched in bulk up front and grouped in
   * memory, and the four bulk reads are issued together because none of them
   * depends on another.
   *
   * `test/orders-query-count.spec.ts` pins the count against the customer
   * count, which is the property that regressed — the per-customer arithmetic
   * was already memoised, so the loop looked like a cache and behaved like an
   * N+1.
   */
  private async decorate(rows: OrderLike[]): Promise<OrderDto[]> {
    if (rows.length === 0) return [];

    const customerIds = [...new Set(rows.map((row) => row.customerId))];

    /**
     * Every bill of every customer on the page, not just the page's own rows:
     * the allocation walks a customer's whole history oldest-first, so a bill
     * left out would let its share of the money fall onto a later one.
     */
    const [allBills, paymentsByCustomer, paidByCustomer, received] =
      await Promise.all([
        this.orders
          .find({ customerId: { $in: customerIds } })
          .select('code customerId totalMinor createdAt')
          .lean<LedgerBillRow[]>(),
        this.payments.ledgerRowsForMany(customerIds),
        this.payments.paidTotalsByCustomer(customerIds),
        this.payments.receivedAtDeliveryMinor(rows.map((row) => row.code)),
      ]);

    const billsByCustomer = new Map<string, LedgerBillRow[]>();
    for (const bill of allBills) {
      const list = billsByCustomer.get(bill.customerId);
      if (list) list.push(bill);
      else billsByCustomer.set(bill.customerId, [bill]);
    }

    const covered = new Map<string, Map<string, number>>();
    const balances = new Map<string, number>();

    for (const customerId of customerIds) {
      const bills = billsByCustomer.get(customerId) ?? [];

      covered.set(
        customerId,
        this.ledger.allocate(paymentsByCustomer.get(customerId) ?? [], bills),
      );

      balances.set(
        customerId,
        this.ledger.balanceMinor(bills, paidByCustomer.get(customerId) ?? 0),
      );
    }

    return rows.map((row) => {
      const settledMinor = covered.get(row.customerId)?.get(row.code) ?? 0;

      return OrderDto.from(row, {
        settledMinor,
        status: this.ledger.status(settledMinor, row.totalMinor),
        receivedAtDeliveryMinor: received.get(row.code) ?? 0,
        customerBalanceMinor: balances.get(row.customerId) ?? 0,
      });
    });
  }

  /** The projection the ledger needs off a bill, without hydrating the rest. */
  private billsFor(customerId: string): Promise<LedgerBillRow[]> {
    return this.orders
      .find({ customerId })
      .select('code customerId totalMinor createdAt')
      .lean<LedgerBillRow[]>()
      .exec();
  }

  /** Newest first. */
  async list(query: PaginationQueryDto = {}): Promise<PageDto<OrderDto>> {
    const paging = resolvePaging(query, this.config.getOrThrow('pagination'));

    const [rows, total] = await Promise.all([
      this.orders
        .find()
        .sort({ createdAt: -1 })
        .skip(paging.skip)
        .limit(paging.limit)
        .lean<OrderLike[]>(),
      this.orders.estimatedDocumentCount(),
    ]);

    /**
     * `decorate` runs on the page, not on the collection. That is the point of
     * putting paging underneath it: the bulk reads it issues are scoped to the
     * customers appearing on *this* page, so the work per request is bounded
     * by `limit` rather than by how long the shop has been trading.
     */
    return PageDto.of(await this.decorate(rows), total, paging);
  }

  async findOne(code: string): Promise<OrderDto> {
    const order = await this.orders.findOne({ code }).lean<OrderLike>();

    if (!order) {
      throw new NotFoundException(`Order ${code} not found.`);
    }

    return (await this.decorate([order]))[0]!;
  }

  /**
   * Raise a bill.
   *
   * The customer is **copied** onto it rather than referenced, so editing or
   * deleting them later leaves an issued receipt intact. The courier name is
   * resolved from the id, never taken from the caller, so the receipt and the
   * driver's scope cannot disagree about who delivers it.
   *
   * `previousBalance` is read from the ledger here and never accepted from the
   * client — a figure supplied by the till would let the client decide what a
   * customer owes.
   *
   * No payment is taken. The bill is raised before the van leaves; the cash
   * turns up at the door, or next week, or in part. That is the ledger's
   * business, not this function's.
   */
  async create(dto: CreateOrderDto): Promise<OrderDto> {
    const customer = await this.customers.findOne(dto.customerId);

    /** An unassigned order is legitimate; a wrong courier id is not. */
    const courier = dto.courierId
      ? await this.couriers.findOne(dto.courierId)
      : undefined;

    const [bills, paidMinor] = await Promise.all([
      this.billsFor(dto.customerId),
      this.payments.paidTotalMinor(dto.customerId),
    ]);

    const balanceMinor = this.ledger.balanceMinor(bills, paidMinor);

    /** A credit balance is not a debt to print on the next docket. */
    const previousBalanceMinor = Math.max(0, balanceMinor);

    const items = dto.items.map((line) => ({
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      priceMinor: toMinorUnits(line.price),
      ...(line.day ? { day: line.day } : {}),
    }));

    const deliveryChargeMinor = toMinorUnits(dto.deliveryCharge ?? 0);
    const totalMinor =
      items.reduce((sum, line) => sum + line.qty * line.priceMinor, 0) +
      deliveryChargeMinor;

    const code = await this.sequence.next('TRX');
    const session = await this.connection.startSession();

    try {
      let created!: OrderDocument;

      await session.withTransaction(async () => {
        /**
         * Inside the transaction, so a book being closed at this moment
         * conflicts with this bill instead of freezing statements without it.
         * The retry then lands the bill in next week's book.
         */
        const book = customer.round
          ? await this.roundBooks.openBook(customer.round, session)
          : null;

        const [order] = await this.orders.create(
          [
            {
              code,
              date: formatTimestamp(new Date()),
              // What the caller scheduled, kept apart from `date`: the bill is
              // stamped when it is raised, the round happens when it happens.
              ...(dto.deliveryDate ? { deliveryDate: dto.deliveryDate } : {}),
              customerId: customer.id,
              customer: snapshotOf(customer),
              ...(book ? { roundBook: book.code } : {}),
              courier: courier?.name ?? 'Unassigned',
              courierId: courier?.id ?? '',
              items,
              deliveryChargeMinor,
              totalMinor,
              previousBalanceMinor,
              grandTotalMinor: totalMinor + previousBalanceMinor,
            },
          ],
          { session },
        );

        /** Same transaction: the bill and the stock move together or not at all. */
        await this.products.decrementStock(items, session);

        created = order;
      });

      return (await this.decorate([created]))[0]!;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Raise next week's bills from a closed round book — mymilkman's standing
   * order: the same customers get the same goods again, and whatever they
   * still owe is printed on the new bill as its previous balance.
   *
   * Called by the close, inside its transaction, so either every customer is
   * billed for next week or the book stays open.
   *
   * - **Every bill is copied**, not one per customer: a customer on a
   *   Mon/Thurs round has a Monday bill and a Thursday bill, and next week
   *   needs both. The goods, the prices actually charged and the delivery
   *   charge are kept; the delivery date moves on a week.
   * - **The customer is re-read**, not copied from the old bill, so a changed
   *   address or phone is on next week's docket. A customer who has since
   *   been deleted or moved to another round is skipped and reported — their
   *   old round is not theirs to be billed on any more.
   * - **Previous balance runs per customer.** It is the ledger balance when
   *   the close runs, plus each bill already raised for them in this loop —
   *   exactly what raising the same bills one by one at the till would print.
   *
   * Four reads, whatever the size of the round, then two writes per bill.
   */
  async rollForward(
    from: Pick<RoundBook, 'code' | 'roundId'>,
    to: Pick<RoundBook, 'code' | 'weekStart'>,
    excludeCustomerIds: readonly string[],
    session: ClientSession,
  ): Promise<RolledForwardDto> {
    const thisWeek = await this.orders
      .find({ roundBook: from.code })
      .sort({ createdAt: 1 })
      .session(session)
      .lean<OrderLike[]>();

    /**
     * Customers on the round with no bill this week — usually someone who was
     * paused and has since been resumed. Their last week's bills are the
     * template: resuming means "start delivering what they had again", and
     * without this they could never come back, having nothing to copy.
     */
    const billedThisWeek = new Set(thisWeek.map((bill) => bill.customerId));
    const returning = (await this.customers.findByRound(from.roundId))
      .filter((c) => !c.paused && !billedThisWeek.has(c.id))
      .map((c) => c.id);

    const source = [...thisWeek, ...(await this.lastWeekBillsOf(returning, from, session))];

    const created: RolledForwardBillDto[] = [];
    const skipped: RolledForwardSkipDto[] = [];
    if (source.length === 0) return { created, skipped };

    const customerIds = [...new Set(source.map((bill) => bill.customerId))];
    const excluded = new Set(excludeCustomerIds);

    const [customers, history, paidByCustomer] = await Promise.all([
      this.customers.findManyByCode(customerIds),
      this.orders
        .find({ customerId: { $in: customerIds } })
        .select('customerId totalMinor')
        .session(session)
        .lean<{ customerId: string; totalMinor: number }[]>(),
      this.payments.paidTotalsByCustomer(customerIds),
    ]);

    /** Billed minus paid, per customer — moved on as each new bill is raised. */
    const balance = new Map<string, number>();
    for (const customerId of customerIds) {
      balance.set(customerId, -(paidByCustomer.get(customerId) ?? 0));
    }
    for (const bill of history) {
      balance.set(bill.customerId, (balance.get(bill.customerId) ?? 0) + bill.totalMinor);
    }

    const skip = (customerId: string, name: string, reason: string) => {
      if (!skipped.some((line) => line.customerId === customerId)) {
        skipped.push({ customerId, name, reason });
      }
    };

    for (const bill of source) {
      const customer = customers.get(bill.customerId);

      if (excluded.has(bill.customerId)) {
        skip(bill.customerId, customer?.name ?? bill.customer.name, 'Left out when the book was closed.');
        continue;
      }
      if (!customer) {
        skip(bill.customerId, bill.customer.name, 'Customer no longer exists.');
        continue;
      }
      if (customer.paused) {
        skip(customer.id, customer.name, 'Paused.');
        continue;
      }
      if (customer.round !== from.roundId) {
        const now = DELIVERY_ROUNDS.find((round) => round.id === customer.round);
        skip(customer.id, customer.name, `Now on ${now ? now.label : 'no round'}.`);
        continue;
      }

      const owed = balance.get(customer.id) ?? 0;
      /** A credit balance is not a debt to print on the next docket. */
      const previousBalanceMinor = Math.max(0, owed);
      const code = await this.sequence.next('TRX');
      const deliveryDate = bill.deliveryDate
        ? nextDeliveryDate(bill.deliveryDate, to.weekStart)
        : undefined;

      await this.orders.create(
        [
          {
            code,
            date: formatTimestamp(new Date()),
            ...(deliveryDate ? { deliveryDate } : {}),
            customerId: customer.id,
            customer: snapshotOf(customer),
            roundBook: to.code,
            courier: bill.courier,
            courierId: bill.courierId,
            items: bill.items.map((line) => ({
              productId: line.productId,
              name: line.name,
              qty: line.qty,
              priceMinor: line.priceMinor,
              ...(line.day ? { day: line.day } : {}),
            })),
            deliveryChargeMinor: bill.deliveryChargeMinor ?? 0,
            totalMinor: bill.totalMinor,
            previousBalanceMinor,
            grandTotalMinor: bill.totalMinor + previousBalanceMinor,
          },
        ],
        { session },
      );

      /** The same stock rule as a bill raised at the till. */
      await this.products.decrementStock(bill.items, session);

      balance.set(customer.id, owed + bill.totalMinor);

      created.push({
        id: code,
        from: bill.code,
        customerId: customer.id,
        customerName: customer.name,
        total: bill.totalMinor / 100,
        previousBalance: previousBalanceMinor / 100,
        grandTotal: (bill.totalMinor + previousBalanceMinor) / 100,
      });
    }

    return { created, skipped };
  }

  /**
   * Each customer's bills from the most recent earlier book on this round that
   * had any, oldest first. One read for all of them.
   */
  private async lastWeekBillsOf(
    customerIds: string[],
    from: Pick<RoundBook, 'code' | 'roundId'>,
    session: ClientSession,
  ): Promise<OrderLike[]> {
    if (customerIds.length === 0) return [];

    const history = await this.orders
      .find({
        customerId: { $in: customerIds },
        'customer.round': from.roundId,
        roundBook: { $exists: true, $ne: from.code },
      })
      .sort({ createdAt: -1 })
      .session(session)
      .lean<OrderLike[]>();

    /** Newest first, so the first book seen per customer is their latest. */
    const latestBook = new Map<string, string>();
    for (const bill of history) {
      if (!latestBook.has(bill.customerId)) latestBook.set(bill.customerId, bill.roundBook!);
    }

    return history
      .filter((bill) => latestBook.get(bill.customerId) === bill.roundBook)
      .reverse();
  }

  /**
   * What this customer still owes, and on which bills. Scoped by id, never by
   * name — two customers can share one, and a rename must not lose a balance.
   */
  async outstanding(customerId: string): Promise<OutstandingDto> {
    const rows = await this.orders
      .find({ customerId })
      .sort({ createdAt: -1 })
      .lean<OrderLike[]>();

    const decorated = await this.decorate(rows);
    const open = decorated.filter((order) => order.status !== PaymentStatus.Paid);

    return {
      orders: open,
      total: Math.max(0, decorated[0]?.customerBalance ?? 0),
      /**
       * Money applied to *these* bills, not everything ever paid: a lifetime
       * total beside a list of open bills reads as though it had settled them.
       */
      paid: open.reduce((sum, order) => sum + order.settledAmount, 0),
    };
  }

  /** The running balance on its own, for a badge or a doorstep figure. */
  async balance(customerId: string): Promise<{ balance: number }> {
    const [bills, paidMinor] = await Promise.all([
      this.billsFor(customerId),
      this.payments.paidTotalMinor(customerId),
    ]);

    const minor = this.ledger.balanceMinor(bills, paidMinor);

    return { balance: minor / 100 };
  }

  /**
   * One courier's deliveries, scoped by id.
   *
   * The id comes from the verified token, never from a route parameter — that
   * is what stops one driver reading another's round.
   */
  async forCourier(
    courierId: string,
    query: PaginationQueryDto = {},
  ): Promise<PageDto<OrderDto>> {
    const paging = resolvePaging(query, this.config.getOrThrow('pagination'));

    /** An admin has no roster id, so their own round is legitimately empty. */
    if (!courierId) return PageDto.of([], 0, paging);

    const filter = { courierId };

    const [rows, total] = await Promise.all([
      this.orders
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(paging.skip)
        .limit(paging.limit)
        .lean<OrderLike[]>(),
      this.orders.countDocuments(filter),
    ]);

    return PageDto.of(await this.decorate(rows), total, paging);
  }

  /** The dashboard's activity log — newest first. */
  async recent(limit = 4): Promise<OrderDto[]> {
    return this.decorate(
      await this.orders
        .find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean<OrderLike[]>(),
    );
  }

  /**
   * What each customer has been billed, in one aggregation.
   *
   * Sums each bill's own `total` — never `grandTotal`, which carries a
   * snapshot of an earlier bill's debt and would count the same money twice.
   */
  async billedTotalsByCustomer(): Promise<Map<string, { billedMinor: number; name: string; round: string }>> {
    const rows = await this.orders.aggregate<{
      _id: string;
      billedMinor: number;
      name: string;
      round: string;
    }>([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$customerId',
          billedMinor: { $sum: '$totalMinor' },
          /** The customer as most recently copied onto a bill. */
          name: { $first: '$customer.name' },
          round: { $first: '$customer.round' },
        },
      },
    ]);

    return new Map(
      rows.map((row) => [
        row._id,
        { billedMinor: row.billedMinor, name: row.name, round: row.round },
      ]),
    );
  }

  /**
   * Every decorated order belonging to the given customers, newest first.
   *
   * Used by the dashboard to find open bills without decorating the whole
   * ledger: a customer whose balance is zero cannot be holding an open bill,
   * so only the ones who owe money are worth the allocation.
   */
  async forCustomers(customerIds: string[]): Promise<OrderDto[]> {
    if (customerIds.length === 0) return [];

    return this.decorate(
      await this.orders
        .find({ customerId: { $in: customerIds } })
        .sort({ createdAt: -1 })
        .lean<OrderLike[]>(),
    );
  }

  /**
   * Billed in pence, and the row count, for the dashboard.
   *
   * Summed by the database. Reading every order into Node to add up one column
   * meant the whole collection crossed the wire for two integers.
   */
  async billedMinor(): Promise<{ billedMinor: number; count: number }> {
    const [row] = await this.orders.aggregate<{
      billedMinor: number;
      count: number;
    }>([
      {
        $group: {
          _id: null,
          billedMinor: { $sum: '$totalMinor' },
          count: { $sum: 1 },
        },
      },
    ]);

    return { billedMinor: row?.billedMinor ?? 0, count: row?.count ?? 0 };
  }
}

/** The customer as copied onto a bill — never referenced, so a later edit leaves it intact. */
function snapshotOf(customer: {
  name: string;
  phone: string;
  address: string;
  area: string;
  postcode: string;
  round: string;
}) {
  return {
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    area: customer.area,
    postcode: customer.postcode,
    round: customer.round,
  };
}

/**
 * The same weekday a week on — or further, if the book was left open long
 * enough that a week on would still fall before the new book's week.
 */
function nextDeliveryDate(previous: string, weekStart: string): string {
  let next = addDays(previous, 7);
  while (next < weekStart) next = addDays(next, 7);
  return next;
}
