/**
 * What is left of the products mock.
 *
 * The catalogue itself moved to the API — `features/products/api/productsApi.ts`
 * talks to MongoDB, and both `seed.products.ts` and `seed.categories.ts` are
 * deleted. Categories went with them; `mockDb.categories` no longer exists.
 *
 * Only the order-time stock hook is still referenced, by `ordersMock.create()`,
 * which has not moved server-side yet.
 */
export const productsMock = {
  /**
   * Draw down stock for an issued order.
   *
   * **A no-op.** Stock lives in MongoDB now, and an order raised through the
   * mock cannot reach it — writing to a local array that no longer backs the
   * catalogue would be worse, because the number on the products screen would
   * not move and the discrepancy would be invisible.
   *
   * Real drawdown belongs in the orders endpoint, in the same transaction that
   * writes the order. Until then, issuing an order does not reduce stock.
   */
  decrementStock(_lines: { productId: string; qty: number }[]): void {
    // TODO: remove with the orders module; the API decrements on order create.
  },
};
