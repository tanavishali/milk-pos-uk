import { UserRole } from '../common/enums';

/**
 * The two accounts the login screen offers.
 *
 * Randomly generated rather than guessable — the prototype's
 * `blanksys123` / `driver123` pair is gone. Still demo credentials: they are
 * printed on the sign-in page, so treat them as public and never reuse them
 * for anything that matters.
 *
 * `courierId` points at a seeded roster row; the courier portal scopes
 * deliveries by it.
 */
export const DEMO_ACCOUNTS = [
  {
    name: 'Ada Whitfield',
    email: 'ada.whitfield@blanksys.pos',
    password: 'Verdant-Meridian-5644',
    role: UserRole.Admin,
    title: 'Head Administrator',
    terminalId: 'TERM-BLANK-99',
  },
  {
    name: 'Bilal Khan',
    email: 'bilal.khan@blanksys.pos',
    password: 'Cobalt-Pennine-6405',
    role: UserRole.Courier,
    title: 'Courier',
    courierId: 'COUR-101',
  },
] as const;
