import { describe, expect, it } from 'vitest';
import { ProductsService } from '../src/modules/products/products.service';
import type { SequenceService } from '../src/database/sequence.service';

/**
 * Drawing stock down for an issued order.
 *
 * This exists because of a silent data-loss bug. The decrement used to be two
 * writes — `$inc` when there was enough on the shelf, then a corrective
 * `$set: 0` when there was not:
 *
 * ```
 * updateOne({ code, quantity: { $gte: qty } }, { $inc: { quantity: -qty } })
 * updateOne({ code, quantity: { $lt:  qty } }, { $set:  { quantity: 0 } })
 * ```
 *
 * Both ran in the order's transaction, and a transaction reads its own writes.
 * So the second statement saw the *already decremented* figure: any line that
 * left less on the shelf than it had just taken — five in stock, three sold,
 * two left — matched `quantity < qty` on the second pass and had the remainder
 * zeroed. No error, no log, just stock quietly vanishing on exactly the items
 * that were running low.
 *
 * The cases below are the arithmetic that has to survive. They are checked by
 * evaluating the update the service actually emits, so the test cannot pass by
 * agreeing with a reimplementation of the rule.
 */

/** The one update operator shape `decrementStock` is allowed to emit. */
interface ClampedUpdate {
  updateOne: {
    filter: { code: string };
    update: [{ $set: { quantity: { $max: [0, { $subtract: [string, number] }] } } }];
  };
}

/** Captures what the service sends to Mongo, and replays it over a fake shelf. */
class Shelf {
  private readonly stock = new Map<string, number>();
  private calls = 0;

  private readonly products = {
    bulkWrite: (ops: ClampedUpdate[]) => {
      this.calls += 1;
      for (const op of ops) this.apply(op);
      return Promise.resolve();
    },
  };

  readonly service = new ProductsService(
    this.products as never,
    {} as SequenceService,
  );

  constructor(initial: Record<string, number>) {
    for (const [code, qty] of Object.entries(initial)) this.stock.set(code, qty);
  }

  /**
   * Evaluates the emitted pipeline stage rather than trusting its shape.
   *
   * `$max: [0, { $subtract: ['$quantity', qty] }]` is the whole fix, so this
   * reads the operands out of the document the service built and does the
   * arithmetic on them. The old two-write version could not even be expressed
   * here: it emitted two operators, and the assertion below counts them.
   */
  private apply(op: ClampedUpdate): void {
    const { filter, update } = op.updateOne;

    expect(update).toHaveLength(1);

    const [floor, subtract] = update[0].$set.quantity.$max;
    const [field, qty] = subtract.$subtract;

    expect(field).toBe('$quantity');

    const current = this.stock.get(filter.code) ?? 0;
    this.stock.set(filter.code, Math.max(floor, current - qty));
  }

  async sell(lines: { productId: string; qty: number }[]) {
    await this.service.decrementStock(lines);
    return this;
  }

  left(code: string) {
    return this.stock.get(code);
  }

  /** Round trips taken. One order is one, however many lines it has. */
  roundTrips() {
    return this.calls;
  }
}

describe('decrementStock', () => {
  it('leaves the remainder on the shelf when part of the stock is sold', async () => {
    // The regression. Five on hand, three sold: two are left, not none.
    const shelf = await new Shelf({ 'PROD-101': 5 }).sell([
      { productId: 'PROD-101', qty: 3 },
    ]);

    expect(shelf.left('PROD-101')).toBe(2);
  });

  it('takes the whole line off when the shelf empties exactly', async () => {
    const shelf = await new Shelf({ 'PROD-101': 3 }).sell([
      { productId: 'PROD-101', qty: 3 },
    ]);

    expect(shelf.left('PROD-101')).toBe(0);
  });

  it('clamps at zero rather than going negative when stock ran short', async () => {
    // The wizard caps each line at stock on hand; if one slips past, a negative
    // count on the shelf is a worse lie than a zero.
    const shelf = await new Shelf({ 'PROD-101': 2 }).sell([
      { productId: 'PROD-101', qty: 5 },
    ]);

    expect(shelf.left('PROD-101')).toBe(0);
  });

  it('does not disturb a well-stocked line', async () => {
    const shelf = await new Shelf({ 'PROD-101': 100 }).sell([
      { productId: 'PROD-101', qty: 1 },
    ]);

    expect(shelf.left('PROD-101')).toBe(99);
  });

  it('applies every line of a multi-line order in one round trip', async () => {
    const shelf = await new Shelf({
      'PROD-101': 5,
      'PROD-102': 4,
      'PROD-103': 1,
    }).sell([
      { productId: 'PROD-101', qty: 3 },
      { productId: 'PROD-102', qty: 4 },
      { productId: 'PROD-103', qty: 2 },
    ]);

    expect(shelf.left('PROD-101')).toBe(2);
    expect(shelf.left('PROD-102')).toBe(0);
    expect(shelf.left('PROD-103')).toBe(0);

    // Was two writes per line — six for this order — and is now one bulkWrite.
    expect(shelf.roundTrips()).toBe(1);
  });

  it('writes nothing at all for an empty order', async () => {
    const shelf = await new Shelf({ 'PROD-101': 5 }).sell([]);

    expect(shelf.roundTrips()).toBe(0);
    expect(shelf.left('PROD-101')).toBe(5);
  });
});
