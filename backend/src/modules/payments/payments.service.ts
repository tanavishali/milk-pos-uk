import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type ClientSession } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PageDto } from '../../common/dto/page.dto';
import {
  PaginationQueryDto,
  resolvePaging,
} from '../../common/dto/pagination-query.dto';
import { toMinorUnits } from '../../common/utils/money';
import { SequenceService } from '../../database/sequence.service';
import { CustomersService } from '../customers/customers.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDto } from './dto/payment.dto';
import type { LedgerPayment } from '../orders/ledger.service';
import { Payment, PaymentDocument } from './schemas/payment.schema';

/** What `ledgerRowsForMany` projects — the allocation's inputs, plus the key. */
type LedgerRow = LedgerPayment & { customerId: string };

/** `YYYY-MM-DD HH:mm` in server-local time — the format the receipt prints. */
export function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private readonly payments: Model<PaymentDocument>,
    private readonly sequence: SequenceService,
    private readonly customers: CustomersService,
    private readonly config: ConfigService,
  ) {}

  /** Newest first, optionally for one customer. */
  async list(
    customerId?: string,
    query: PaginationQueryDto = {},
  ): Promise<PageDto<PaymentDto>> {
    const paging = resolvePaging(query, this.config.getOrThrow('pagination'));
    const filter = customerId ? { customerId } : {};

    /**
     * `countDocuments` when there is a filter, `estimatedDocumentCount` when
     * there is not. The estimate reads collection metadata and is constant
     * time, but it cannot answer a filtered question — and the ledger is the
     * collection that grows without bound, so the distinction is worth making
     * rather than always paying for the walk.
     */
    const [rows, total] = await Promise.all([
      this.payments
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(paging.skip)
        .limit(paging.limit)
        /** Read-only: the DTO is built field by field, so hydration buys nothing. */
        .lean<Payment[]>(),
      customerId
        ? this.payments.countDocuments(filter)
        : this.payments.estimatedDocumentCount(),
    ]);

    return PageDto.of(
      rows.map((row) => PaymentDto.from(row)),
      total,
      paging,
    );
  }

  /**
   * The ledger rows for a whole set of customers, in one query, grouped by
   * customer and oldest-first within each group.
   *
   * **This is the method that removes the N+1.** Decorating a list of orders
   * needs every payment belonging to every customer on the page; asking per
   * customer meant one round trip each, run sequentially, so a page covering
   * two hundred customers cost two hundred serial trips before a byte was
   * returned. One `$in` with a compound sort answers all of them, and the
   * grouping is free in memory.
   *
   * Sorted by the database on `{ customerId: 1, createdAt: 1 }`, which is an
   * index — so the rows arrive already grouped and already in the order the
   * allocation applies them.
   */
  async ledgerRowsForMany(
    customerIds: string[],
  ): Promise<Map<string, LedgerPayment[]>> {
    const byCustomer = new Map<string, LedgerPayment[]>();
    for (const customerId of customerIds) byCustomer.set(customerId, []);

    if (customerIds.length === 0) return byCustomer;

    const rows = await this.payments
      .find({ customerId: { $in: customerIds } })
      .select('customerId amountMinor appliesTo createdAt')
      .sort({ customerId: 1, createdAt: 1 })
      .lean<LedgerRow[]>();

    for (const row of rows) byCustomer.get(row.customerId)?.push(row);

    return byCustomer;
  }

  /** Everything the customer has ever paid, in pence. */
  async paidTotalMinor(customerId: string): Promise<number> {
    const [row] = await this.payments.aggregate<{ total: number }>([
      { $match: { customerId } },
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]);

    return row?.total ?? 0;
  }

  /**
   * What was handed over at one particular delivery, in pence, keyed by order.
   */
  async receivedAtDeliveryMinor(
    orderIds: string[],
  ): Promise<Map<string, number>> {
    if (orderIds.length === 0) return new Map();

    const rows = await this.payments.aggregate<{ _id: string; total: number }>([
      { $match: { orderId: { $in: orderIds } } },
      { $group: { _id: '$orderId', total: { $sum: '$amountMinor' } } },
    ]);

    return new Map(rows.map((row) => [row._id, row.total]));
  }

  /**
   * Everything each customer has paid, in one pass.
   *
   * Aggregated rather than looped: the dashboard needs this for every customer
   * at once, and one round trip beats one per head.
   */
  async paidTotalsByCustomer(
    customerIds?: string[],
  ): Promise<Map<string, number>> {
    if (customerIds?.length === 0) return new Map();

    const rows = await this.payments.aggregate<{ _id: string; total: number }>([
      ...(customerIds ? [{ $match: { customerId: { $in: customerIds } } }] : []),
      { $group: { _id: '$customerId', total: { $sum: '$amountMinor' } } },
    ]);

    return new Map(rows.map((row) => [row._id, row.total]));
  }

  /**
   * Every payment ever taken, in pence — the dashboard's `collected`.
   *
   * Summed by the database. Pulling the column into Node to `reduce` it meant
   * the whole collection crossed the wire for a single integer.
   */
  async collectedMinor(): Promise<number> {
    const [row] = await this.payments.aggregate<{ total: number }>([
      { $group: { _id: null, total: { $sum: '$amountMinor' } } },
    ]);

    return row?.total ?? 0;
  }

  async create(
    dto: CreatePaymentDto,
    session?: ClientSession,
  ): Promise<PaymentDto> {
    /** Scoped by id, never by name: two customers can share one. */
    await this.customers.findOne(dto.customerId);

    const [created] = await this.payments.create(
      [
        {
          code: await this.sequence.next('PAY'),
          customerId: dto.customerId,
          orderId: dto.orderId || undefined,
          appliesTo: dto.appliesTo || undefined,
          amountMinor: toMinorUnits(dto.amount),
          date: formatTimestamp(new Date()),
          receivedBy: dto.receivedBy.trim() || 'Admin',
        },
      ],
      { session },
    );

    return PaymentDto.from(created);
  }

  /**
   * Undo a mis-keyed collection.
   *
   * Nothing needs repairing afterwards: every status and balance is derived
   * from the ledger on read, so removing the row is the whole correction.
   */
  async remove(code: string): Promise<{ id: string }> {
    const deleted = await this.payments.findOneAndDelete({ code });

    if (!deleted) {
      throw new NotFoundException(`Payment ${code} not found.`);
    }

    return { id: code };
  }
}
