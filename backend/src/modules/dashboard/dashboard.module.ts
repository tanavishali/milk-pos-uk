import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Courier, CourierSchema } from '../couriers/schemas/courier.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * A read-only projection over the other modules. It owns no collection of its
 * own — the row counts come straight from the registries.
 */
@Module({
  imports: [
    OrdersModule,
    PaymentsModule,
    MongooseModule.forFeature([
      { name: Customer.name, schema: CustomerSchema },
      { name: Courier.name, schema: CourierSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
