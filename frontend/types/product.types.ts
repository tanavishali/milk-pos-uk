export interface Product {
  id: string;
  name: string;
  category: string;
  /** List price, shown struck through next to the sale price. */
  retailPrice: number;
  /** The price actually charged, and the wizard's starting price. */
  salePrice: number;
  quantity: number;
}

export type ProductDraft = Omit<Product, "id">;

/** Stock at or below this reads as low and renders in the danger colour. */
export const LOW_STOCK_THRESHOLD = 10;
