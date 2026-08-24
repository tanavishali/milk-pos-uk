import type { AuthUser } from "@app-types/index";
import { reportError } from "@utils/libs/reportError";

const KEY = "blanksys.session";

/**
 * Session persistence, so a refresh does not dump the cashier back at the login
 * screen mid-shift.
 *
 * `sessionStorage`, not `localStorage`: a shared till should forget the operator
 * when the tab closes. Every access is wrapped — private mode and locked-down
 * browsers throw on the accessor itself, not just on read.
 */
export function readSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch (error) {
    reportError(error, "readSession");
    return null;
  }
}

export function writeSession(user: AuthUser): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(user));
  } catch (error) {
    reportError(error, "writeSession");
  }
}

export function clearSession(): void {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch (error) {
    reportError(error, "clearSession");
  }
}
