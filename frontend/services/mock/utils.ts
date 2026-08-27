/** Anything the mock store keys by id. */
interface Identified {
  id: string;
}

const ID_PATTERN = /^(.+)-(\d+)$/;

/**
 * Next id for a prefix, derived from the rows that already exist: one above the
 * highest number in use. `TRX-8920` is followed by `TRX-8921`.
 *
 * Deliberately not clock- or random-based. A generator like
 * `` `TRX-${Date.now() % 10000}` `` looks unique but draws from 0000-9999, and
 * the seed already occupies 8901-8920 — so roughly one sale in 500 minted an id
 * that already existed, which surfaced as React's "two children with the same
 * key" and two rows fighting over one identity. Reading the maximum in use
 * cannot collide, needs no entropy, and keeps ids ordered and readable.
 *
 * A real backend assigns ids itself; this only has to hold until then.
 */
export function nextId(prefix: string, rows: Identified[]): string {
  const highest = rows.reduce((max, row) => {
    const match = ID_PATTERN.exec(row.id);
    // Ignore rows from another prefix, and any id not of the form `PREFIX-<n>`.
    if (!match || match[1] !== prefix) return max;
    return Math.max(max, Number(match[2]));
  }, 0);

  return `${prefix}-${highest + 1}`;
}

/**
 * Tripwire for the invariant `nextId` is supposed to guarantee. A duplicate id
 * otherwise surfaces far from its cause — as React's "two children with the same
 * key" in whichever list happens to render it — so this fails at the point the
 * row is created, naming the id and the collection.
 *
 * Development only: in production a POS must not refuse a sale over a key clash.
 */
export function assertUniqueId(
  collection: string,
  id: string,
  rows: Identified[],
): void {
  if (process.env.NODE_ENV === "production") return;
  if (rows.some((row) => row.id === id)) {
    throw new Error(
      `mockDb.${collection}: id "${id}" already exists. ` +
        `nextId should make this impossible — check the generator.`,
    );
  }
}

/**
 * Stand-in for network latency on reads.
 *
 * Without it `queryFn` resolves in the same tick, `isLoading` is true for
 * roughly zero milliseconds, and every skeleton in the app is dead code that
 * nobody ever sees — including on a slow connection, where it matters most.
 * A real API will supply its own latency; this keeps the loading path honest
 * until then.
 */
export const READ_LATENCY_MS = 280;

/**
 * The same for writes.
 *
 * A save that returns in the same tick is not a faster app, it is an app with no
 * loading state: the spinner never paints, the button never disables, and the
 * only sign a click did anything is a row appearing a moment later when the
 * invalidated list finishes refetching. That is precisely the "did that work?"
 * gap. A real API will replace this with its own round trip.
 */
export const WRITE_LATENCY_MS = 320;

export function delay(ms: number = READ_LATENCY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Deep-ish clone for handing callers data they cannot mutate in place. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}
