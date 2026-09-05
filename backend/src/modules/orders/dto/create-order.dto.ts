import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Weekday } from '../../../common/enums';

export class CreateOrderLineDto {
  @ApiProperty({ example: 'PROD-101' })
  @IsString()
  @MinLength(1)
  productId!: string;

  @ApiProperty({ example: 'Belgian Chocolate Fudge Cake' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  qty!: number;

  @ApiProperty({
    example: 24.5,
    description: 'The price charged, in pounds — the cashier may have overridden it.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  price!: number;

  @ApiPropertyOptional({
    enum: Weekday,
    example: Weekday.Mon,
    description: 'Omit for a one-off sale to someone with no round.',
  })
  @IsOptional()
  @IsEnum(Weekday)
  day?: Weekday;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'CUST-101' })
  @IsString()
  @MinLength(1)
  customerId!: string;

  @ApiProperty({
    example: 'COUR-101',
    description: 'The name is resolved from this id server-side, never taken from the caller.',
  })
  @IsString()
  courierId!: string;

  @ApiProperty({
    example: 4.5,
    default: 0,
    description: 'Delivery fee charged for this order, in pounds.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  deliveryCharge?: number;

  @ApiProperty({ type: [CreateOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'An order needs at least one line.' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  items!: CreateOrderLineDto[];
}
