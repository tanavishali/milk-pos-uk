import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { fromMinorUnits } from '../../common/utils/money';
import { Courier, type CourierDocument } from '../couriers/schemas/courier.schema';
import { Customer, type CustomerDocument } from '../customers/schemas/customer.schema';
import { OrderDto } from '../orders/dto/order.dto';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { DashboardMetricsDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
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
}
