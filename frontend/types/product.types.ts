export interface Product {
  id: string;
  name: string;
  category: string;
  /** What the item sells for, and the wizard's starting price. */
  salePrice: number;
  quantity: number;
}

export type ProductDraft = Omit<Product, "id">;

/**
 * What the Add form sends.
 *
 * The stock count is not known when an item is first written down, so it is not
 * asked for. The API starts it at nothing; it is set later through the edit
 * form, which sends the full `ProductDraft`.
 */
export type NewProductDraft = Omit<ProductDraft, "quantity">;

