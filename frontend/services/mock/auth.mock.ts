import type { AuthUser, Credentials } from "@app-types/index";
import { CURRENT_USER, DEMO_CREDENTIALS } from "@constants/app";

/**
 * Credential check for the prototype. A single hard-coded pair, compared in
 * plain text — this is a stand-in for an identity provider, not a security
 * boundary, and nothing here should survive contact with a real backend.
 */
export const authMock = {
  signIn({ email, password }: Credentials): AuthUser {
    const emailMatches =
      email.trim().toLowerCase() === DEMO_CREDENTIALS.email.toLowerCase();

    if (!emailMatches || password !== DEMO_CREDENTIALS.password) {
      throw new Error("Incorrect email or password.");
    }

    return {
      name: CURRENT_USER.name,
      email: CURRENT_USER.email,
      role: CURRENT_USER.role,
      terminalId: CURRENT_USER.terminalId,
    };
  },
};
