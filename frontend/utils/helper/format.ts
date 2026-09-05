/**
 * `€1,234.50` — the only money formatter; every price goes through it,
 * including the receipt PDF.
 *
 * `style: "currency"` rather than a hand-written prefix, so a negative comes
 * out as `-€5.00` rather than `€-5.00`. `en-IE` is the euro locale that
 * groups the way the rest of this UI reads: comma thousands, dot decimals.
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString("en-IE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** `YYYY-MM-DD HH:mm` in local time â€” the format receipts print. */
export function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * `YYYY-MM-DD` in local time — what an `<input type="date">` reads and writes.
 *
 * Built from the local parts rather than `toISOString()`, which converts to UTC
 * first: east of Greenwich that hands back tomorrow's date late in the evening,
 * and the round would be scheduled for the wrong day.
 */
export function formatDateInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Whether a string is a calendar date the API will accept — the same shape the
 * backend's `@Matches` on `deliveryDate` enforces.
 *
 * Named and exported rather than inlined at the one call site so the rule has a
 * single home: a date the wizard waves through and the server rejects fails at
 * the worst possible moment, after the cashier has finished the order.
 */
export function isDeliveryDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * `Mon 8 Sep 2026` from a `YYYY-MM-DD` string — the weekday is the point, since
 * a round is planned in days of the week.
 *
 * Parsed by hand rather than through `new Date(string)`, which reads a bare
 * `YYYY-MM-DD` as UTC midnight and so shows the day before in any negative
 * offset. Returns the input untouched if it is not a date, so a receipt never
 * prints "Invalid Date".
 */
export function formatDeliveryDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** "JS" from "Jhony Soda" â€” at most two letters, for avatar chips. */
export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/**
 * "Showing 1-10 of 20", clamped so an empty list reads "Showing 0-0 of 0".
 * `pageItemCount` is how many rows this page actually renders — not the number
 * of pages, which is a different number that reads the same in a call.
 */
export function rangeLabel(
  startIndex: number,
  pageItemCount: number,
  total: number,
): string {
  const from = total === 0 ? 0 : Math.min(startIndex + 1, total);
  const to = Math.min(startIndex + pageItemCount, total);
  return `Showing ${from}-${to} of ${total}`;
}

/**
 * The city from a free-text address — the last comma-separated segment.
 *
 * The seed addresses all end with the city ("House 42-B, Model Town, Lahore"),
 * so this is right for the data we have and cheap to replace with a real field
 * when addresses become structured. Returns the whole string when there is no
 * comma, which is better than returning nothing.
 */
export function cityOf(address: string): string {
  const parts = address.split(",");
  return (parts[parts.length - 1] ?? address).trim();
}

/** Count of distinct, non-empty values. */
export function distinctCount(values: (string | undefined)[]): number {
  return new Set(values.filter((v): v is string => Boolean(v))).size;
}
