import { ApiProperty } from '@nestjs/swagger';
import { Weekday } from '../../../common/enums';
import type { CustomerDocument } from '../schemas/customer.schema';

/** Field for field what the frontend's `Customer` type expects. */
export class CustomerDto {
  @ApiProperty({ example: 'CUST-101' })
  id!: string;

  @ApiProperty({ example: 'Zainab Ahmed' })
  name!: string;

  @ApiProperty({ example: '+92 300 1234567' })
  phone!: string;

  @ApiProperty({ example: 'mon-pm-thu-pm', description: 'Round id, or empty for a walk-in.' })
  round!: string;

  @ApiProperty({ enum: Weekday, isArray: true, example: ['mon', 'thu'] })
  deliveryDays!: Weekday[];

  @ApiProperty({ example: 'zainab.ahmed@gmail.com' })
  email!: string;

  @ApiProperty({ example: 'Model Town, Lahore' })
  area!: string;

  @ApiProperty({ example: 'House 42-B, Model Town, Lahore' })
  address!: string;

  @ApiProperty({ example: '54000' })
  postcode!: string;

  static from(doc: CustomerDocument): CustomerDto {
    return {
      id: doc.code,
      name: doc.name,
      phone: doc.phone,
      round: doc.round,
      deliveryDays: doc.deliveryDays,
      email: doc.email,
      area: doc.area,
      address: doc.address,
      postcode: doc.postcode,
    };
  }
}
