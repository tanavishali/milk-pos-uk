import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { PaymentStatus } from '../../common/enums';
import { toMinorUnits } from '../../common/utils/money';
import { SequenceService } from '../../database/sequence.service';
import { CouriersService } from '../couriers/couriers.service';
import { CustomersService } from '../customers/customers.service';
import { PaymentsService, formatTimestamp } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderDto, OutstandingDto } from './dto/order.dto';
import { LedgerService } from './ledger.service';
import { Order, OrderDocument } from './schemas/order.schema';

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
  ) {}

  /**
   * Attach the four ledger-derived fields.
   *
   * The allocation and balance are computed once per customer and reused across
   * the batch, so a twenty-row list does not recompute twenty times.
   */
  private async decorate(rows: OrderDocument[]): Promise<OrderDto[]> {
    const customerIds = [...new Set(rows.map((row) => row.customerId))];

    const allBills = await this.orders
      .find({ customerId: { $in: customerIds } })
      .select('code customerId totalMinor createdAt');

    const billsByCustomer = new Map<string, OrderDocument[]>();
    for (const bill of allBills) {
      const list = billsByCustomer.get(bill.customerId) ?? [];
      list.push(bill);
      billsByCustomer.set(bill.customerId, list);
    }

    const covered = new Map<string, Map<string, number>>();
    const balances = new Map<string, number>();

    for (const customerId of customerIds) {
      const bills = billsByCustomer.get(customerId) ?? [];
      covered.set(customerId, await this.ledger.allocate(customerId, bills));
      balances.set(
        customerId,
        this.ledger.balanceMinor(
          bills,
          await this.payments.paidTotalMinor(customerId),
        ),
      );
    }

    const received = await this.payments.receivedAtDeliveryMinor(
      rows.map((row) => row.code),
    );

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

  /** Newest first. */
  async list(): Promise<OrderDto[]> {
    return this.decorate(await this.orders.find().sort({ createdAt: -1 }));
  }

  async findOne(code: string): Promise<OrderDto> {
    const order = await this.orders.findOne({ code });

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

    const bills = await this.orders
      .find({ customerId: dto.customerId })
      .select('code customerId totalMinor createdAt');

    const balanceMinor = this.ledger.balanceMinor(
      bills,
      await this.payments.paidTotalMinor(dto.customerId),
    );

    /** A credit balance is not a debt to print on the next docket. */
    const previousBalanceMinor = Math.max(0, balanceMinor);

    const items = dto.items.map((line) => ({
      productId: line.productId,
      name: line.name,
      qty: line.qty,
      priceMinor: toMinorUnits(line.price),
      ...(line.day ? { day: line.day } : {}),
    }));

    const totalMinor = items.reduce(
      (sum, line) => sum + line.qty * line.priceMinor,
      0,
    );

    const code = await this.sequence.next('TRX');
    const session = await this.connection.startSession();

    try {
      let created!: OrderDocument;

      await session.withTransaction(async () => {
        const [order] = await this.orders.create(
          [
            {
              code,
              date: formatTimestamp(new Date()),
              customerId: customer.id,
              customer: {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
                area: customer.area,
                postcode: customer.postcode,
                round: customer.round,
              },
              courier: courier?.name ?? 'Unassigned',
              courierId: courier?.id ?? '',
              items,
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
   * What this customer still owes, and on which bills. Scoped by id, never by
   * name — two customers can share one, and a rename must not lose a balance.
   */
  async outstanding(customerId: string): Promise<OutstandingDto> {
    const rows = await this.orders
      .find({ customerId })
      .sort({ createdAt: -1 });

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
    const bills = await this.orders
      .find({ customerId })
      .select('code customerId totalMinor createdAt');

    const minor = this.ledger.balanceMinor(
      bills,
      await this.payments.paidTotalMinor(customerId),
    );

    return { balance: minor / 100 };
  }

  /** One courier's deliveries, scoped by id. */
  async forCourier(courierId: string): Promise<OrderDto[]> {
    return this.decorate(
      await this.orders.find({ courierId }).sort({ createdAt: -1 }),
    );
  }

  /** The dashboard's activity log — newest first. */
  async recent(limit = 4): Promise<OrderDto[]> {
    return this.decorate(
      await this.orders.find().sort({ createdAt: -1 }).limit(limit),
    );
  }

  /** Billed in pence, and the row count, for the dashboard. */
  async billedMinor(): Promise<{ billedMinor: number; count: number }> {
    const rows = await this.orders.find().select('totalMinor');
    return {
      billedMinor: rows.reduce((sum, row) => sum + row.totalMinor, 0),
      count: rows.length,
    };
  }
}
