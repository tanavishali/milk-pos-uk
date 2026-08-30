/**
 * Base URL of the real backend, including its `/api` prefix.
 *
 * Read from `NEXT_PUBLIC_API_URL` so a deployed build can point somewhere
 * else. Inlined at build time by Next, which is why it is referenced as a
 * whole expression rather than indexed dynamically.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
