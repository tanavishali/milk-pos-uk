import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { LedgerService } from '../orders/ledger.service';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { PaymentsModule } from '../payments/payments.module';
import { RoundBooksController } from './round-books.controller';
import { RoundBooksService } from './round-books.service';
import { RoundBook, RoundBookSchema } from './schemas/round-book.schema';

/**
 * Registers the `Order` model itself rather than importing `OrdersModule`.
 *
 * `OrdersModule` has to import this one — raising a bill stamps it with the
 * open book — so importing it back would be a cycle. Mongoose hands both
 * modules the same model for the same schema name, and `LedgerService` is a
 * stateless set of pure functions, so a second instance of it costs nothing.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RoundBook.name, schema: RoundBookSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    DatabaseModule,
    PaymentsModule,
  ],
  controllers: [RoundBooksController],
  providers: [RoundBooksService, LedgerService],
  exports: [RoundBooksService],
})
export class RoundBooksModule {}
