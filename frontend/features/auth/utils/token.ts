import { reportError } from "@utils/libs/reportError";

const KEY = "blanksys.token";

/**
 * The bearer token issued by `POST /auth/login`, kept beside the session it
 * belongs to.
 *
 * Stored separately from the `AuthUser` so the shape the app renders stays
 * exactly what the backend documents as `AuthUser` — a token is a credential,
 * not a profile field, and nothing in the UI should ever be able to render it.
 *
 * `sessionStorage`, matching `session.ts`: a shared till forgets the operator
 * when the tab closes. Every access is wrapped because private mode and
 * locked-down browsers throw on the accessor itself.
 */
export function readToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch (error) {
    reportError(error, "readToken");
    return null;
  }
}

export function writeToken(token: string): void {
  try {
    window.sessionStorage.setItem(KEY, token);
  } catch (error) {
    reportError(error, "writeToken");
  }
}

export function clearToken(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch (error) {
    reportError(error, "clearToken");
  }
}
