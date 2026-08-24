/** Brand and terminal identity, and the defaults the Settings page edits. */
export const APP_NAME = "BLANKSYS";
export const APP_TAGLINE = "Point of Sales";

export const CURRENT_USER = {
  name: "Jhony Soda",
  role: "Administrator",
  title: "Head Administrator",
  badge: "Super Admin",
  email: "jhony.soda@blanksys.pos",
  terminalId: "TERM-BLANK-99",
} as const;

export const DEFAULT_POS_SETTINGS = {
  storeName: "BLANKSYS POS Store #102",
  receiptNote: "Thank you for choosing BLANKSYS Point of Sales.",
} as const;

/**
 * Demo credentials. This is a prototype with no auth backend — the pair is
 * checked in `services/mock/auth.mock.ts` and shown on the login screen on
 * purpose. Delete both the moment a real identity provider is wired in.
 */
export const DEMO_CREDENTIALS = {
  email: "jhony.soda@blanksys.pos",
  password: "blanksys123",
} as const;

/** Rows per page in every registry view. */
export const PAGE_SIZE = 10;
