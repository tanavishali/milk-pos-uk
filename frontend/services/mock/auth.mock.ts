import type { AuthUser, Credentials } from "@app-types/index";
import { CURRENT_USER, DEMO_CREDENTIALS } from "@constants/app";
import { UserRole } from "@enums/index";
import { credentialsMock } from "./credentials";
import { db } from "./seed";

const WRONG = "Incorrect email or password.";

const sameEmail = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Credential check for the prototype. Two kinds of account:
 *
 * - the single hard-coded admin, who gets the whole terminal
 * - any courier on the roster, who gets their own deliveries and nothing else
 *
 * Compared in plain text. This is a stand-in for an identity provider, not a
 * security boundary — a real backend hashes, rate-limits, and issues a token the
 * API itself verifies on every request.
 *
 * Both failure paths return the same message on purpose: saying "no such user"
 * versus "wrong password" tells an attacker which emails are real.
 */
export const authMock = {
  signIn({ email, password }: Credentials): AuthUser {
    if (sameEmail(email, DEMO_CREDENTIALS.email)) {
      if (password !== DEMO_CREDENTIALS.password) throw new Error(WRONG);
      return {
        name: CURRENT_USER.name,
        email: CURRENT_USER.email,
        role: UserRole.Admin,
        title: CURRENT_USER.title,
        terminalId: CURRENT_USER.terminalId,
      };
    }

    const courier = db.couriers.find((c) => sameEmail(c.email, email));
    if (!courier || !credentialsMock.matches(courier.id, password)) {
      throw new Error(WRONG);
    }

    return {
      name: courier.name,
      email: courier.email,
      role: UserRole.Courier,
      title: "Courier",
      courierId: courier.id,
    };
  },
};
