/**
 * Stock at or below this reads as low and wants reordering.
 *
 * Mirrors `LOW_STOCK_THRESHOLD` in `frontend/types/product.types.ts`, which
 * colours the figure red at the same point. It lives on both sides because
 * both sides answer the question — the API to rank what needs buying, the UI
 * to warn the person looking at a single row.
 */
export const LOW_STOCK_THRESHOLD = 10;
