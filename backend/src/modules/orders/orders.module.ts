import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CouriersModule } from '../couriers/couriers.module';
import { CustomersModule } from '../customers/customers.module';
import { PaymentsModule } from '../payments/payments.module';
import { ProductsModule } from '../products/products.module';
import { LedgerService } from './ledger.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    DatabaseModule,
    /** The ledger reads the payment side; a bill's status is derived from it. */
    PaymentsModule,
    CustomersModule,
    CouriersModule,
    /** Issuing a bill draws stock down in the same transaction. */
    ProductsModule,
    /** For the guard on `/orders/mine`, which scopes a driver from their token. */
    AuthModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, LedgerService],
  exports: [OrdersService, LedgerService],
})
export class OrdersModule {}
