/**
 * Fault injection for the mock backend.
 *
 * Read endpoints cannot fail on their own, which means the error states they
 * render would be untestable and would rot. This switch makes the failure path
 * reachable on demand, from the console:
 *
 *   __blanksysMock.failReads(true)   // every read now fails
 *   __blanksysMock.failReads(false)  // back to normal
 *
 * Prototype scaffolding, like the rest of `services/mock/` — it goes when a real
 * API arrives and starts producing its own failures.
 */
let failReads = false;

export function setFailReads(value: boolean): void {
  failReads = value;
}

export function shouldFailRead(): boolean {
  return failReads;
}

export const READ_FAILURE_MESSAGE = "The terminal could not reach the server.";

declare global {
  interface Window {
    __blanksysMock?: { failReads: (value: boolean) => void };
  }
}

if (typeof window !== "undefined") {
  window.__blanksysMock = { failReads: setFailReads };
}
