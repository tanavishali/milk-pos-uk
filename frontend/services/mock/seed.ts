import type { Courier, Customer, Order, Product } from "@app-types/index";
import { seedCategories } from "./seed.categories";
import { seedCouriers } from "./seed.couriers";
import { seedCustomers } from "./seed.customers";
import { seedOrders } from "./seed.orders";
import { seedProducts } from "./seed.products";
import type { Category } from "./types";

/**
 * The one mutable store every mock domain reads and writes. In-memory: it
 * resets on refresh, which is the honest behaviour until there is a backend.
 *
 * **`orders` is newest-first.** `create()` unshifts, so the seed — which is
 * written in chronological order — is reversed on build to establish that
 * invariant from the start. Without it the array is half ascending and half
 * descending, and "the 4 most recent" silently means "the 4 oldest".
 */
export interface MockDatabase {
  categories: Category[];
  customers: Customer[];
  products: Product[];
  couriers: Courier[];
  orders: Order[];
}

function buildDatabase(): MockDatabase {
  return {
    categories: [...seedCategories],
    customers: [...seedCustomers],
    products: [...seedProducts],
    couriers: [...seedCouriers],
    orders: [...seedOrders].reverse(),
  };
}

/**
 * Pinned to a global in development so the store has one predictable lifetime.
 *
 * Without this, Fast Refresh decides: re-evaluating this module mints a second
 * `db` while other modules still close over the first, so reads and writes can
 * land in different objects and rows appear to duplicate or vanish. Pinning
 * makes the store survive a hot reload intact and reset only on a full page
 * load — the same rule the rest of the app already documents.
 *
 * In production the module is evaluated once, so the global is redundant and
 * the plain object is used.
 */
const GLOBAL_KEY = Symbol.for("blanksys.mockDb");

type GlobalWithDb = typeof globalThis & { [GLOBAL_KEY]?: MockDatabase };

function resolveDatabase(): MockDatabase {
  if (process.env.NODE_ENV === "production") return buildDatabase();

  const scope = globalThis as GlobalWithDb;
  scope[GLOBAL_KEY] ??= buildDatabase();
  return scope[GLOBAL_KEY];
}

export const db: MockDatabase = resolveDatabase();

/** Restore the seed. Used by tests, and available from the console in dev. */
export function resetDatabase(): void {
  const fresh = buildDatabase();
  db.categories = fresh.categories;
  db.customers = fresh.customers;
  db.products = fresh.products;
  db.couriers = fresh.couriers;
  db.orders = fresh.orders;
}
