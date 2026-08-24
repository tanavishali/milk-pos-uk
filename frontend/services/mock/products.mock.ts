import type { Product, ProductDraft } from "@app-types/index";
import { db } from "./seed";
import type { Category } from "./types";
import { assertUniqueId, clone, nextId } from "./utils";

export const productsMock = {
  list(): Product[] {
    return clone(db.products);
  },

  find(id: string): Product | undefined {
    return clone(db.products.find((p) => p.id === id));
  },

  create(draft: ProductDraft): Product {
    const id = nextId("PROD", db.products);
    assertUniqueId("products", id, db.products);
    const created: Product = { id, ...draft };
    db.products.unshift(created);
    return clone(created);
  },

  update(id: string, draft: ProductDraft): Product {
    const index = db.products.findIndex((p) => p.id === id);
    if (index === -1) throw new Error(`Product ${id} not found`);
    const updated: Product = { id, ...draft };
    db.products[index] = updated;
    return clone(updated);
  },

  remove(id: string): string {
    db.products = db.products.filter((p) => p.id !== id);
    return id;
  },

  /**
   * Draw down stock for an issued order. Clamped at zero: overselling is a
   * validation concern for the wizard, and a negative on-hand count would be a
   * worse lie than a zero.
   */
  decrementStock(lines: { productId: string; qty: number }[]): void {
    for (const line of lines) {
      const product = db.products.find((p) => p.id === line.productId);
      if (product) product.quantity = Math.max(0, product.quantity - line.qty);
    }
  },
};

export const categoriesMock = {
  list(): Category[] {
    return [...db.categories];
  },

  /** Idempotent — adding a category that already exists is a no-op, not an error. */
  create(name: string): Category[] {
    const trimmed = name.trim();
    if (trimmed && !db.categories.includes(trimmed)) {
      db.categories.push(trimmed);
    }
    return [...db.categories];
  },
};
