import { ApiProperty } from '@nestjs/swagger';
import type { CourierDocument } from '../schemas/courier.schema';

/**
 * A courier as the API returns it — field for field the frontend's `Courier`
 * type, which has no password field. Nothing here can leak a credential
 * because there is nowhere to put one.
 */
export class CourierDto {
  @ApiProperty({ example: 'COUR-101' })
  id!: string;

  @ApiProperty({ example: 'Bilal Khan' })
  name!: string;

  @ApiProperty({ example: '+92 333 4455667' })
  phone!: string;

  @ApiProperty({ example: '35201-5566778-9', description: 'National ID card number.' })
  idcard!: string;

  @ApiProperty({ example: 'bilal.khan@blanksys.pos' })
  email!: string;

  @ApiProperty({ example: 'G-11 & G-10 Sectors', description: 'The patch covered.' })
  area!: string;

  @ApiProperty({ example: 'G-11/2, Islamabad', description: 'Where the courier lives.' })
  address!: string;

  static from(doc: CourierDocument): CourierDto {
    return {
      id: doc.code,
      name: doc.name,
      phone: doc.phone,
      idcard: doc.idcard,
      email: doc.email,
      area: doc.area,
      address: doc.address,
    };
  }
}
