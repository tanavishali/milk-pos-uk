import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Weekday } from '../../../common/enums';
import { ROUND_IDS } from '../../delivery/delivery.constants';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Zainab Ahmed' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+92 300 1234567' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  phone!: string;

  @ApiPropertyOptional({
    example: 'mon-pm-thu-pm',
    description: 'One of the ids from `GET /delivery/rounds`, or empty for a walk-in.',
    default: '',
  })
  @IsOptional()
  @IsString()
  /** Empty is legitimate — a walk-in is on no round — so it is allowed alongside the ids. */
  @IsIn(['', ...ROUND_IDS], { message: 'round must be a known delivery round id, or empty.' })
  round?: string;

  @ApiPropertyOptional({
    enum: Weekday,
    isArray: true,
    example: ['mon', 'thu'],
    description: 'Days actually delivered. Independent of `round` on purpose.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(Weekday, { each: true })
  deliveryDays?: Weekday[];

  @ApiProperty({ example: 'zainab.ahmed@gmail.com', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @ApiProperty({ example: 'Model Town, Lahore' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  area!: string;

  @ApiProperty({ example: 'House 42-B, Model Town, Lahore' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address!: string;

  @ApiProperty({ example: '54000' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  postcode!: string;
}
