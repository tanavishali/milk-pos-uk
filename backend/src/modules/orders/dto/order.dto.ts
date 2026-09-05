import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus, Weekday } from '../../../common/enums';
import { fromMinorUnits } from '../../../common/utils/money';
import type { OrderDocument } from '../schemas/order.schema';

export class OrderLineDto {
  @ApiProperty({ example: 'PROD-101' })
  productId!: string;

  @ApiProperty({ example: 'Belgian Chocolate Fudge Cake' })
  name!: string;

  @ApiProperty({ example: 1 })
  qty!: number;

  @ApiProperty({ example: 24.5, description: 'The price actually charged, in pounds.' })
  price!: number;

  @ApiPropertyOptional({ enum: Weekday, example: Weekday.Mon })
  day?: Weekday;
}

export class OrderCustomerDto {
  @ApiProperty({ example: 'Zainab Ahmed' }) name!: string;
  @ApiProperty({ example: '+92 300 1234567' }) phone!: string;
  @ApiProperty({ example: 'House 42-B, Model Town, Lahore' }) address!: string;
  @ApiProperty({ example: 'Model Town, Lahore' }) area!: string;
  @ApiProperty({ example: '54000' }) postcode!: string;
  @ApiProperty({ example: 'mon-pm-thu-pm' }) round!: string;
}

/**
 * An order as the API returns it: what is stored, plus the four fields the
 * ledger works out on every read.
 */
export class OrderDto {
  @ApiProperty({ example: 'TRX-8901' })
  id!: string;

  @ApiProperty({ example: 'CUST-101' })
  customerId!: string;

  @ApiProperty({ example: '2026-08-21 14:10' })
  date!: string;

  @ApiPropertyOptional({
    example: '2026-09-08',
    description: 'The day this goes out, as set when the bill was raised.',
  })
  deliveryDate?: string;

  @ApiProperty({ type: OrderCustomerDto })
  customer!: OrderCustomerDto;

  @ApiProperty({ example: 'Bilal Khan', description: 'The name printed on the receipt.' })
  courier!: string;

  @ApiProperty({ example: 'COUR-101' })
  courierId!: string;

  @ApiProperty({ type: [OrderLineDto] })
  items!: OrderLineDto[];

  @ApiProperty({
    example: 4.5,
    description: 'Delivery charge added to this order.',
  })
  deliveryCharge!: number;

  @ApiProperty({
    example: 32.1,
    description: 'The goods on this delivery, including any delivery charge.',
  })
  total!: number;

  @ApiProperty({
    example: 10,
    description:
      'What was already owed when this bill was raised — a docket snapshot, not a debt of its own.',
  })
  previousBalance!: number;

  @ApiProperty({ example: 42.1, description: 'What the driver asks for at this door.' })
  grandTotal!: number;

  @ApiProperty({
    example: 32.1,
    description:
      "How much of this bill's own total the ledger covers, oldest bill first. Computed, never stored.",
  })
  settledAmount!: number;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.Paid })
  status!: PaymentStatus;

  @ApiProperty({
    example: 32.1,
    description:
      'Cash handed over at *this* delivery. Distinct from `settledAmount` — money taken at Saturday’s door can settle Monday’s bill.',
  })
  receivedAtDelivery!: number;

  @ApiProperty({ example: 0, description: 'Everything this customer owes right now.' })
  customerBalance!: number;

  /** Everything except the four derived fields, which the caller supplies. */
  static from(
    doc: OrderDocument,
    derived: {
      settledMinor: number;
      status: PaymentStatus;
      receivedAtDeliveryMinor: number;
      customerBalanceMinor: number;
    },
  ): OrderDto {
    return {
      id: doc.code,
      customerId: doc.customerId,
      date: doc.date,
      // Spread rather than a plain assignment: orders raised before this field
      // existed have none, and an explicit `undefined` would serialise as a key
      // that is present but empty.
      ...(doc.deliveryDate ? { deliveryDate: doc.deliveryDate } : {}),
      customer: {
        name: doc.customer.name,
        phone: doc.customer.phone,
        address: doc.customer.address,
        area: doc.customer.area,
        postcode: doc.customer.postcode,
        round: doc.customer.round,
      },
      courier: doc.courier,
      courierId: doc.courierId,
      items: doc.items.map((line) => ({
        productId: line.productId,
        name: line.name,
        qty: line.qty,
        price: fromMinorUnits(line.priceMinor),
        ...(line.day ? { day: line.day } : {}),
      })),
      deliveryCharge: fromMinorUnits(doc.deliveryChargeMinor ?? 0),
      total: fromMinorUnits(doc.totalMinor),
      previousBalance: fromMinorUnits(doc.previousBalanceMinor),
      grandTotal: fromMinorUnits(doc.grandTotalMinor),
      settledAmount: fromMinorUnits(derived.settledMinor),
      status: derived.status,
      receivedAtDelivery: fromMinorUnits(derived.receivedAtDeliveryMinor),
      customerBalance: fromMinorUnits(derived.customerBalanceMinor),
    };
  }
}

export class OutstandingDto {
  @ApiProperty({ type: [OrderDto], description: 'The bills still open, newest first.' })
  orders!: OrderDto[];

  @ApiProperty({ example: 49, description: 'The running balance.' })
  total!: number;

  @ApiProperty({
    example: 10,
    description:
      'How much of *these* bills is already covered — not everything the customer has ever paid.',
  })
  paid!: number;
}
