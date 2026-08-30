import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricsDto {
  @ApiProperty({
    example: 402.4,
    description: 'Goods billed, counted when the bill is raised — not when the cash lands.',
  })
  grossProfit!: number;

  @ApiProperty({
    example: 287.92,
    description: 'Cash actually received. On a credit round this trails `grossProfit`.',
  })
  collected!: number;

  @ApiProperty({
    example: 114.48,
    description: '`grossProfit - collected` — what is still out with customers.',
  })
  outstanding!: number;

  @ApiProperty({ example: 20 })
  totalOrders!: number;

  @ApiProperty({ example: 20 })
  totalCustomers!: number;

  @ApiProperty({ example: 20 })
  totalCouriers!: number;
}
