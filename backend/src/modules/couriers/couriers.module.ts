import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '../../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CouriersController } from './couriers.controller';
import { CouriersService } from './couriers.service';
import { Courier, CourierSchema } from './schemas/courier.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Courier.name, schema: CourierSchema }]),
    DatabaseModule,
    /** For `AccountsService`: a roster row and its login move together. */
    AuthModule,
  ],
  controllers: [CouriersController],
  providers: [CouriersService],
  exports: [CouriersService],
})
export class CouriersModule {}
