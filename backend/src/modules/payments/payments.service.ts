import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type ClientSession } from 'mongoose';
import { toMinorUnits } from '../../common/utils/money';
import { SequenceService } from '../../database/sequence.service';
import { CustomersService } from '../customers/customers.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentDto } from './dto/payment.dto';
import { Payment, PaymentDocument } from './schemas/payment.schema';

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
  ) {}

  /** Newest first, optionally for one customer. */
  async list(customerId?: string): Promise<PaymentDto[]> {
    const rows = await this.payments
      .find(customerId ? { customerId } : {})
      .sort({ createdAt: -1 });

    return rows.map((row) => PaymentDto.from(row));
  }

  /**
   * Every payment for a customer, oldest first — the order the ledger applies
   * them in. Returned raw (pence) because the ledger never leaves integers.
   */
  async ledgerRowsFor(customerId: string): Promise<PaymentDocument[]> {
    return this.payments.find({ customerId }).sort({ createdAt: 1 });
  }

  /** Everything the customer has ever paid, in pence. */
  async paidTotalMinor(customerId: string): Promise<number> {
    const rows = await this.payments.find({ customerId }).select('amountMinor');
    return rows.reduce((sum, row) => sum + row.amountMinor, 0);
  }

  /** What was handed over at one particular delivery, in pence, keyed by order. */
  async receivedAtDeliveryMinor(
    orderIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.payments
      .find({ orderId: { $in: orderIds } })
      .select('orderId amountMinor');

    const byOrder = new Map<string, number>();
    for (const row of rows) {
      if (!row.orderId) continue;
      byOrder.set(row.orderId, (byOrder.get(row.orderId) ?? 0) + row.amountMinor);
    }

    return byOrder;
  }

  /**
   * Everything each customer has paid, in one pass.
   *
   * Aggregated rather than looped: the dashboard needs this for every customer
   * at once, and one round trip beats one per head.
   */
  async paidTotalsByCustomer(): Promise<Map<string, number>> {
    const rows = await this.payments.aggregate<{ _id: string; total: number }>([
      { $group: { _id: '$customerId', total: { $sum: '$amountMinor' } } },
    ]);

    return new Map(rows.map((row) => [row._id, row.total]));
  }

  /** Every payment ever taken, in pence — the dashboard's `collected`. */
  async collectedMinor(): Promise<number> {
    const rows = await this.payments.find().select('amountMinor');
    return rows.reduce((sum, row) => sum + row.amountMinor, 0);
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
