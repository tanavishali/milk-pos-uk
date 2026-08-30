import { ApiProperty } from '@nestjs/swagger';
import { PaymentStatus } from '../../../common/enums';
import { ProductDto } from '../../products/dto/product.dto';
import { DashboardMetricsDto } from './dashboard.dto';

/** A customer who owes money, and how much of it. */
export class DebtorDto {
  @ApiProperty({ example: 'CUST-104' })
  customerId!: string;

  @ApiProperty({ example: 'Daniyal Qureshi' })
  name!: string;

  @ApiProperty({ example: 'wed-sat', description: 'Round id, or empty for a walk-in.' })
  round!: string;

  @ApiProperty({ example: 49, description: 'Everything still owed, across all their bills.' })
  balance!: number;

  @ApiProperty({ example: 1, description: 'How many of their bills are not yet Paid.' })
  openBills!: number;
}

/** A bill with money still on it. */
export class OpenBillDto {
  @ApiProperty({ example: 'TRX-8918' })
  id!: string;

  @ApiProperty({ example: 'CUST-104' })
  customerId!: string;

  @ApiProperty({ example: 'Daniyal Qureshi' })
  customerName!: string;

  @ApiProperty({ example: 'Farhan Akhtar' })
  courier!: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.Unpaid })
  status!: PaymentStatus;

  @ApiProperty({ example: 49, description: "The bill's own total." })
  total!: number;

  @ApiProperty({
    example: 49,
    description:
      "What is left on **this** bill — `total - settledAmount`. Not the door total, which carries an earlier bill's debt.",
  })
  remaining!: number;

  @ApiProperty({ example: '2026-08-28 09:40' })
  date!: string;
}

/** A capped list, and how many rows it stands for. */
export class PanelDto<T> {
  rows!: T[];
  total!: number;
}

export class DebtorPanelDto {
  @ApiProperty({ type: [DebtorDto] })
  rows!: DebtorDto[];

  @ApiProperty({ example: 5, description: 'How many customers owe money in total.' })
  total!: number;
}

export class OpenBillPanelDto {
  @ApiProperty({ type: [OpenBillDto] })
  rows!: OpenBillDto[];

  @ApiProperty({ example: 5 })
  total!: number;
}

export class LowStockPanelDto {
  @ApiProperty({ type: [ProductDto] })
  rows!: ProductDto[];

  @ApiProperty({ example: 0 })
  total!: number;
}

/**
 * Everything the dashboard screen needs, in one response.
 *
 * One request rather than four: every panel is a view of the same round at the
 * same moment, and fetching them separately lets the figures disagree with each
 * other on screen while the last one is still in flight.
 */
export class DashboardOverviewDto {
  @ApiProperty({ type: DashboardMetricsDto })
  metrics!: DashboardMetricsDto;

  @ApiProperty({ type: DebtorPanelDto, description: 'Who owes money, biggest debt first.' })
  debtors!: DebtorPanelDto;

  @ApiProperty({ type: OpenBillPanelDto, description: 'Bills not yet settled, newest first.' })
  openBills!: OpenBillPanelDto;

  @ApiProperty({ type: LowStockPanelDto, description: 'Below the reorder point, scarcest first.' })
  lowStock!: LowStockPanelDto;
}
