/** `$1,234.50` â€” the only money formatter; every price goes through it. */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** `YYYY-MM-DD HH:mm` in local time â€” the format receipts print. */
export function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
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
