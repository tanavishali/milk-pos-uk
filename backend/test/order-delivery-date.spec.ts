import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { PaymentStatus } from '../src/common/enums';
import { CreateOrderDto } from '../src/modules/orders/dto/create-order.dto';
import { OrderDto } from '../src/modules/orders/dto/order.dto';
import type { OrderDocument } from '../src/modules/orders/schemas/order.schema';

/**
 * The scheduled delivery date, end to end through the API contract: what the
 * caller is allowed to send, and what comes back out.
 *
 * The date is the one field on an order that nothing else can be derived from —
 * a wrong `total` shows up on the next docket, but a date that quietly fails
 * validation and is dropped leaves the van going out on the wrong day with no
 * trace of why. So both directions are pinned here.
 */

/** A valid order body, with whatever the case under test overrides. */
function body(overrides: Partial<CreateOrderDto> = {}) {
  return plainToInstance(CreateOrderDto, {
    customerId: 'CUST-101',
    courierId: 'COUR-101',
    deliveryCharge: 4.5,
    items: [{ productId: 'PROD-101', name: 'Milk', qty: 2, price: 1.35 }],
    ...overrides,
  });
}

/** The errors class-validator raises for one property, if any. */
function errorsFor(dto: CreateOrderDto, property: string): string[] {
  return validateSync(dto)
    .filter((error) => error.property === property)
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateOrderDto.deliveryDate', () => {
  it('accepts a calendar date', () => {
    expect(errorsFor(body({ deliveryDate: '2026-09-08' }), 'deliveryDate')).toEqual([]);
  });

  it('is optional — an unscheduled order is still a valid order', () => {
    expect(errorsFor(body(), 'deliveryDate')).toEqual([]);
  });

  it.each([
    ['a UK-style date', '08/09/2026'],
    ['a timestamp', '2026-09-08 10:30'],
    ['a single-digit month', '2026-9-08'],
    ['empty', ''],
    ['nonsense', 'monday'],
  ])('rejects %s', (_label, value) => {
    expect(errorsFor(body({ deliveryDate: value }), 'deliveryDate')).not.toEqual([]);
  });

  it('does not disturb the rest of the body', () => {
    expect(validateSync(body({ deliveryDate: '2026-09-08' }))).toEqual([]);
  });
});

/** A stored order, with the derived figures a caller of `from` supplies. */
function doc(overrides: Partial<OrderDocument> = {}): OrderDocument {
  return {
    code: 'TRX-8901',
    date: '2026-09-05 10:45',
    customerId: 'CUST-101',
    customer: {
      name: 'Frank McEneaney',
      phone: '1234321',
      address: 'house no 3 Clontibret',
      area: 'Clontibret',
      postcode: '234322',
      round: 'mon-am',
    },
    courier: 'Tanawish Ali',
    courierId: 'COUR-101',
    items: [{ productId: 'PROD-101', name: 'Milk', qty: 2, priceMinor: 135 }],
    deliveryChargeMinor: 450,
    totalMinor: 720,
    previousBalanceMinor: 0,
    grandTotalMinor: 720,
    ...overrides,
  } as OrderDocument;
}

const derived = {
  settledMinor: 0,
  status: PaymentStatus.Unpaid,
  receivedAtDeliveryMinor: 0,
  customerBalanceMinor: 720,
};

describe('OrderDto.from', () => {
  it('returns the stored delivery date unchanged', () => {
    const dto = OrderDto.from(doc({ deliveryDate: '2026-09-08' }), derived);
    expect(dto.deliveryDate).toBe('2026-09-08');
  });

  it('omits the key entirely for an order raised before the field existed', () => {
    const dto = OrderDto.from(doc(), derived);
    expect(dto.deliveryDate).toBeUndefined();
    expect('deliveryDate' in dto).toBe(false);
  });

  it('carries every other field through alongside it', () => {
    const dto = OrderDto.from(doc({ deliveryDate: '2026-09-08' }), derived);
    expect(dto).toMatchObject({
      id: 'TRX-8901',
      date: '2026-09-05 10:45',
      deliveryDate: '2026-09-08',
      customerId: 'CUST-101',
      courier: 'Tanawish Ali',
      courierId: 'COUR-101',
      deliveryCharge: 4.5,
      total: 7.2,
      previousBalance: 0,
      grandTotal: 7.2,
      status: PaymentStatus.Unpaid,
    });
    expect(dto.customer.name).toBe('Frank McEneaney');
    expect(dto.items).toEqual([
      { productId: 'PROD-101', name: 'Milk', qty: 2, price: 1.35 },
    ]);
  });
});
