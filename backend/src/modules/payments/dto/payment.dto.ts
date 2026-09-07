import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { fromMinorUnits } from '../../../common/utils/money';
import type { Payment } from '../schemas/payment.schema';

/** Field for field the frontend's `Payment` type. */
export class PaymentDto {
  @ApiProperty({ example: 'PAY-101' })
  id!: string;

  @ApiProperty({ example: 'CUST-101' })
  customerId!: string;

  @ApiPropertyOptional({
    example: 'TRX-8901',
    description: 'The delivery the cash was handed over at, if it was.',
  })
  orderId?: string;

  @ApiPropertyOptional({
    example: 'TRX-8901',
    description: 'The bill this money is for, when the operator named one.',
  })
  appliesTo?: string;

  @ApiProperty({ example: 32.1, description: 'In pounds. Stored as integer pence.' })
  amount!: number;

  @ApiProperty({ example: '2026-08-21 14:10' })
  date!: string;

  @ApiProperty({ example: 'Bilal Khan' })
  receivedBy!: string;

/**
   * The stored shape rather than the hydrated document: every read path is
   * `.lean()`, and this mapper only ever reads fields. A `PaymentDocument` still
   * satisfies it, so the write paths pass one straight through.
   */
  static from(doc: Payment): PaymentDto {
    return {
      id: doc.code,
      customerId: doc.customerId,
      orderId: doc.orderId,
      appliesTo: doc.appliesTo,
      amount: fromMinorUnits(doc.amountMinor),
      date: doc.date,
      receivedBy: doc.receivedBy,
    };
  }
}
