import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 'CUST-101', description: 'Whose money it is.' })
  @IsString()
  @MinLength(1)
  customerId!: string;

  @ApiPropertyOptional({
    example: 'TRX-8920',
    description:
      'The delivery the cash came in at. Recorded where it was taken, not where it is applied.',
  })
  @IsOptional()
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({
    example: 'TRX-8920',
    description:
      'The bill this money is for. Omit to clear the oldest debt first, which is what a customer means when they hand over cash without naming a bill.',
  })
  @IsOptional()
  @IsString()
  appliesTo?: string;

  @ApiProperty({
    example: 32.1,
    description:
      'In pounds. Must be above zero — "he paid nothing" is the absence of a payment, not a payment of zero.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'A payment needs an amount above zero.' })
  @Max(1_000_000)
  amount!: number;

  @ApiProperty({
    example: 'Bilal Khan',
    description: 'The courier who took it, or "Admin" at the terminal.',
  })
  @IsString()
  @MaxLength(120)
  receivedBy!: string;
}
