import { readToken } from "@features/auth/utils/token";
import { API_BASE_URL } from "./config";

/**
 * The one place a request to the real backend is built.
 *
 * Endpoints still being served by `services/mock/` do not come through here —
 * each feature moves over as its API is written, and this keeps the moved ones
 * from each repeating the base URL, the bearer header and the error shape.
 */

/** The error body every failed request comes back in, per the API's filter. */
interface ApiError {
  message?: string | string[];
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

const NETWORK_FAILURE = "Cannot reach the server. Check your connection.";

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = readToken();

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        // Sent when there is one. The catalogue is readable without a session
        // today; adding a guard server-side will not need a change here.
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    // A thrown fetch is the network, not a rejected request.
    throw new HttpError(NETWORK_FAILURE, 0);
  }

  // 204 has no body to parse; nothing in this API returns one yet, but a
  // delete is the obvious next candidate.
  const body: unknown =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    const { message } = (body ?? {}) as ApiError;
    throw new HttpError(
      Array.isArray(message)
        ? message.join(" ")
        : (message ?? `Request failed (${response.status}).`),
      response.status,
    );
  }

  return body as T;
}

/** RTK Query's `queryFn` contract: never throw, return `{ data }` or `{ error }`. */
export async function queryFor<T>(
  run: () => Promise<T>,
): Promise<{ data: T } | { error: string }> {
  try {
    return { data: await run() };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : NETWORK_FAILURE,
    };
  }
}
