import { COURIER_DEFAULT_PASSWORD } from "@constants/app";
import { seedCouriers } from "./seed.couriers";

/**
 * Courier sign-in passwords, keyed by courier id.
 *
 * Kept in its own store rather than on the `Courier` row so a password can never
 * ride along on a read — `couriersMock.list()` returns `Courier[]`, which has no
 * password field, and nothing here is reachable from an endpoint that returns
 * courier data.
 *
 * Plain text, compared directly. That is acceptable only because this is a mock
 * standing in for an identity provider; a real backend hashes and never returns
 * the value at all.
 */
const passwords = new Map<string, string>(
  seedCouriers.map((c) => [c.id, COURIER_DEFAULT_PASSWORD]),
);

export const credentialsMock = {
  set(courierId: string, password: string): void {
    passwords.set(courierId, password);
  },

  /** Leaves the existing password alone when the field was left blank. */
  setIfProvided(courierId: string, password?: string): void {
    const trimmed = password?.trim();
    if (trimmed) passwords.set(courierId, trimmed);
  },

  matches(courierId: string, password: string): boolean {
    return passwords.get(courierId) === password;
  },

  remove(courierId: string): void {
    passwords.delete(courierId);
  },
};
