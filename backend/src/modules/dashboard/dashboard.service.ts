import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentStatus } from '../../common/enums';
import { fromMinorUnits } from '../../common/utils/money';
import { Courier, type CourierDocument } from '../couriers/schemas/courier.schema';
import { Customer, type CustomerDocument } from '../customers/schemas/customer.schema';
import { OrderDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { ProductsService } from '../products/products.service';
import { DashboardMetricsDto } from './dto/dashboard.dto';
import {
  DashboardOverviewDto,
  DebtorDto,
  OpenBillDto,
} from './dto/overview.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
    private readonly products: ProductsService,
    @InjectModel(Customer.name)
    private readonly customers: Model<CustomerDocument>,
    @InjectModel(Courier.name)
    private readonly couriers: Model<CourierDocument>,
  ) {}

  async metrics(): Promise<DashboardMetricsDto> {
    const [{ billedMinor, count }, collectedMinor, totalCustomers, totalCouriers] =
      await Promise.all([
        this.orders.billedMinor(),
        this.payments.collectedMinor(),
        this.customers.countDocuments(),
        this.couriers.countDocuments(),
      ]);

    return {
      grossProfit: fromMinorUnits(billedMinor),
      collected: fromMinorUnits(collectedMinor),
      /**
       * Billed less collected. Sums each bill's own `total`, so money that
       * rolled forward onto a later docket is not counted twice.
       */
      outstanding: fromMinorUnits(billedMinor - collectedMinor),
      totalOrders: count,
      totalCustomers,
      totalCouriers,
    };
  }

  recent(limit: number): Promise<OrderDto[]> {
    return this.orders.recent(limit);
  }

  /**
   * The whole dashboard in one response.
   *
   * The two ledger panels are built together because they share an expensive
   * step. Ranking debtors needs only two aggregations — billed per customer and
   * paid per customer — but deciding *which bills* are open needs the
   * allocation, which is per customer and not something a query can express.
   *
   * The saving is that **a customer whose balance is zero cannot be holding an
   * open bill**: allocation caps each bill at its own total and pushes the
   * remainder to the oldest unpaid one, so when payments equal billings every
   * bill ends up covered. That makes the debtor list an exact filter for the
   * open-bill list, and the allocation runs over those customers only rather
   * than over the entire ledger.
   */
  async overview(limit: number): Promise<DashboardOverviewDto> {
    const [metrics, billedByCustomer, paidByCustomer, lowStock] =
      await Promise.all([
        this.metrics(),
        this.orders.billedTotalsByCustomer(),
        this.payments.paidTotalsByCustomer(),
        this.products.lowStock(limit),
      ]);

    const owing: DebtorDto[] = [];

    for (const [customerId, billed] of billedByCustomer) {
      const balanceMinor = billed.billedMinor - (paidByCustomer.get(customerId) ?? 0);
      if (balanceMinor <= 0) continue;

      owing.push({
        customerId,
        name: billed.name,
        round: billed.round,
        balance: fromMinorUnits(balanceMinor),
        /** Filled in below, once the allocation says which bills are open. */
        openBills: 0,
      });
    }

    owing.sort((a, b) => b.balance - a.balance);

    /** Only the customers who owe something can have an open bill. */
    const decorated = await this.orders.forCustomers(
      owing.map((row) => row.customerId),
    );

    const openByCustomer = new Map<string, number>();
    const openBills: OpenBillDto[] = [];

    for (const order of decorated) {
      if (order.status === PaymentStatus.Paid) continue;

      openByCustomer.set(
        order.customerId,
        (openByCustomer.get(order.customerId) ?? 0) + 1,
      );

      openBills.push({
        id: order.id,
        customerId: order.customerId,
        customerName: order.customer.name,
        courier: order.courier,
        status: order.status,
        total: order.total,
        /**
         * What is left on this bill alone. Never the door total — that carries
         * a snapshot of an earlier bill's debt, which is still owed on that
         * earlier bill and would be counted twice here.
         */
        remaining: order.total - order.settledAmount,
        date: order.date,
      });
    }

    for (const row of owing) {
      row.openBills = openByCustomer.get(row.customerId) ?? 0;
    }

    return {
      metrics,
      debtors: { rows: owing.slice(0, limit), total: owing.length },
      openBills: { rows: openBills.slice(0, limit), total: openBills.length },
      lowStock,
    };
  }
}
