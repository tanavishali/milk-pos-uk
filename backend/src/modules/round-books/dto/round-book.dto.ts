import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString } from 'class-validator';
import { RoundBookStatus } from '../../../common/enums';
import { fromMinorUnits } from '../../../common/utils/money';
import type { BookStatement, BookSummary } from '../round-book.summary';
import type { RoundBook } from '../schemas/round-book.schema';
import { addDays } from '../round-book.summary';

export class RoundBookSummaryDto {
  @ApiProperty({ example: 42 }) orderCount!: number;
  @ApiProperty({ example: 38 }) customerCount!: number;

  @ApiProperty({ example: 512.4, description: "This book's bills, goods only." })
  billed!: number;

  @ApiProperty({ example: 470, description: "How much of this book's bills is paid." })
  settled!: number;

  @ApiProperty({ example: 42.4, description: 'This week’s bills still open.' })
  outstanding!: number;

  @ApiProperty({
    example: 61.9,
    description:
      'What the customers on this book owe across every bill — what rolls into next week.',
  })
  carriedForward!: number;

  static from(summary: BookSummary): RoundBookSummaryDto {
    return {
      orderCount: summary.orderCount,
      customerCount: summary.customerCount,
      billed: fromMinorUnits(summary.billedMinor),
      settled: fromMinorUnits(summary.settledMinor),
      outstanding: fromMinorUnits(summary.outstandingMinor),
      carriedForward: fromMinorUnits(summary.carriedForwardMinor),
    };
  }
}

export class RoundBookStatementDto {
  @ApiProperty({ example: 'CUST-101' }) customerId!: string;
  @ApiProperty({ example: 'Una Ivanova' }) name!: string;
  @ApiProperty({ example: 2 }) orderCount!: number;
  @ApiProperty({ example: 7.48 }) billed!: number;
  @ApiProperty({ example: 7.48 }) settled!: number;

  @ApiProperty({
    example: 0,
    description: 'Their whole account when the book closed. Negative is a credit.',
  })
  balance!: number;

  static from(line: BookStatement): RoundBookStatementDto {
    return {
      customerId: line.customerId,
      name: line.name,
      orderCount: line.orderCount,
      billed: fromMinorUnits(line.billedMinor),
      settled: fromMinorUnits(line.settledMinor),
      balance: fromMinorUnits(line.balanceMinor),
    };
  }
}

export class RoundBookDto {
  @ApiProperty({ example: 'RB-101' }) id!: string;
  @ApiProperty({ example: 'mon-thu' }) roundId!: string;
  @ApiProperty({ example: 'Mon/Thurs' }) roundLabel!: string;

  @ApiProperty({ example: '2026-09-21', description: 'The Monday the week starts.' })
  weekStart!: string;

  @ApiProperty({ example: '2026-09-27', description: 'The Sunday it ends.' })
  weekEnd!: string;

  @ApiProperty({ enum: RoundBookStatus, example: RoundBookStatus.Open })
  status!: RoundBookStatus;

  @ApiPropertyOptional({ example: '2026-09-27T20:14:00.000Z' })
  closedAt?: string;

  @ApiPropertyOptional({ example: 'ada@blanksys.pos' })
  closedBy?: string;

  @ApiProperty({
    type: RoundBookSummaryDto,
    description:
      'Frozen when the book closed. For an open book, computed from the ledger on this read.',
  })
  summary!: RoundBookSummaryDto;

  @ApiPropertyOptional({
    type: [RoundBookStatementDto],
    description: 'One line per customer. Only returned for a single book.',
  })
  statements?: RoundBookStatementDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'What to check before closing. Only on an open book; none of them stops the close.',
  })
  warnings?: string[];

  static from(
    book: RoundBook,
    live?: {
      summary: BookSummary;
      statements?: BookStatement[];
      warnings?: string[];
    },
  ): RoundBookDto {
    const summary = live?.summary ?? book.summary ?? EMPTY_SUMMARY;
    const statements = live?.statements ?? book.statements;

    return {
      id: book.code,
      roundId: book.roundId,
      roundLabel: book.roundLabel,
      weekStart: book.weekStart,
      weekEnd: addDays(book.weekStart, 6),
      status: book.status,
      ...(book.closedAt ? { closedAt: book.closedAt.toISOString() } : {}),
      ...(book.closedBy ? { closedBy: book.closedBy } : {}),
      summary: RoundBookSummaryDto.from(summary),
      ...(statements ? { statements: statements.map(RoundBookStatementDto.from) } : {}),
      ...(live?.warnings ? { warnings: live.warnings } : {}),
    };
  }
}

/** What the operator sends with a close. Everything in it is optional. */
export class CloseRoundBookDto {
  @ApiPropertyOptional({
    type: [String],
    example: ['CUST-109'],
    description:
      'Customers **not** to bill for next week — someone who has stopped their order. Everyone else billed in this book gets the same bills again.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  excludeCustomerIds?: string[];
}

/** One bill raised for next week by the close. Money in pounds. */
export class RolledForwardBillDto {
  @ApiProperty({ example: 'TRX-8930' }) id!: string;
  @ApiProperty({ example: 'TRX-8903', description: 'The bill it was copied from.' })
  from!: string;
  @ApiProperty({ example: 'CUST-103' }) customerId!: string;
  @ApiProperty({ example: 'Ayesha Tariq' }) customerName!: string;
  @ApiProperty({ example: 10.7, description: 'This bill’s own goods.' }) total!: number;
  @ApiProperty({ example: 19.2, description: 'What they already owed, printed on it.' })
  previousBalance!: number;
  @ApiProperty({ example: 29.9, description: 'Due at the door.' }) grandTotal!: number;
}

/** A customer the close did not bill for next week, and why. */
export class RolledForwardSkipDto {
  @ApiProperty({ example: 'CUST-109' }) customerId!: string;
  @ApiProperty({ example: 'Maryam Javed' }) name!: string;
  @ApiProperty({ example: 'Excluded when closing.' }) reason!: string;
}

export class RolledForwardDto {
  @ApiProperty({ type: [RolledForwardBillDto] }) created!: RolledForwardBillDto[];
  @ApiProperty({ type: [RolledForwardSkipDto] }) skipped!: RolledForwardSkipDto[];
}

export class CloseRoundBookResultDto {
  @ApiProperty({ type: RoundBookDto, description: 'The book just closed, with its statements.' })
  closed!: RoundBookDto;

  @ApiProperty({ type: RoundBookDto, description: 'The book opened in its place.' })
  next!: RoundBookDto;

  @ApiProperty({
    type: RolledForwardDto,
    description: "Next week's bills raised by the close, and the customers left out.",
  })
  rolledForward!: RolledForwardDto;
}

const EMPTY_SUMMARY: BookSummary = {
  orderCount: 0,
  customerCount: 0,
  billedMinor: 0,
  settledMinor: 0,
  outstandingMinor: 0,
  carriedForwardMinor: 0,
};
