/**
 * Case-insensitive "does any of these fields contain the query" test. An empty
 * query matches everything, so a search box starts by showing the full list.
 */
export function matchesQuery(
  query: string,
  ...fields: (string | undefined)[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field?.toLowerCase().includes(q));
}
