/** Brand and terminal identity, and the defaults the Settings page edits. */
export const APP_NAME = "BLANKSYS";
export const APP_TAGLINE = "Point of Sales";

export const CURRENT_USER = {
  name: "Ada Whitfield",
  role: "Administrator",
  title: "Head Administrator",
  badge: "Super Admin",
  email: "ada.whitfield@blanksys.pos",
  terminalId: "TERM-BLANK-99",
} as const;

export const DEFAULT_POS_SETTINGS = {
  storeName: "BLANKSYS POS Store #102",
  receiptNote: "Thank you for choosing BLANKSYS Point of Sales.",
} as const;

/**
 * Demo credentials, shown on the login screen on purpose.
 *
 * These are now real accounts in MongoDB, seeded by the backend's
 * `npm run seed:users`, and checked by `POST /api/auth/login` against a bcrypt
 * hash. The auth mock that used to check them is deleted.
 * Change them there and here together, or the card stops working.
 *
 * Still demo credentials: printed on a public page, so never reused for
 * anything that matters.
 */
export const DEMO_CREDENTIALS = {
  email: "ada.whitfield@blanksys.pos",
  password: "Verdant-Meridian-5644",
} as const;

/**
 * A courier to sign in as, surfaced on the login screen beside the admin pair.
 * Seeded alongside the admin, and scoped to courier `COUR-101`.
 */
export const DEMO_COURIER = {
  email: "bilal.khan@blanksys.pos",
  password: "Cobalt-Pennine-6405",
} as const;

/** Rows per page in every registry view. */
export const PAGE_SIZE = 10;
