/**
 * Cache tag registry. RTK Query silently ignores a tag that is not in
 * `tagTypes`, so a new tag must be added here before any endpoint uses it.
 */
export const tags = {
  Session: "Session",
  Customer: "Customer",
  Product: "Product",
  Category: "Category",
  Courier: "Courier",
  Order: "Order",
  DashboardMetrics: "DashboardMetrics",
} as const;

export type TagType = (typeof tags)[keyof typeof tags];

export const tagTypes: TagType[] = Object.values(tags);
