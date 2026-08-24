/**
 * Every route string in the app. Nothing should hardcode a URL — `nav.ts` and
 * every `<Link>` build on this, so a rename is one edit.
 */
export const paths = {
  root: "/",
  login: "/login",
  dashboard: "/dashboard",
  orders: "/orders",
  customers: "/customers",
  products: "/products",
  couriers: "/couriers",
  settings: "/settings",
  profile: "/profile",
} as const;

export type AppPath = (typeof paths)[keyof typeof paths];
