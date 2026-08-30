import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { tagTypes } from "./tags";

/**
 * The single RTK Query root. Features add their endpoints with
 * `baseApi.injectEndpoints({...})` — never a second `createApi`, never a raw
 * `fetch`.
 *
 * Still `fakeBaseQuery` even though every endpoint now talks to the real API.
 * Each one supplies a `queryFn` that goes through `services/api/http.ts`, which
 * already owns the base URL, the bearer header and the error shape.
 *
 * Swapping in `fetchBaseQuery` would change the error type from a plain string
 * to `FetchBaseQueryError` across all nine endpoint modules at once, for no
 * behavioural gain — the components read a string today. Worth doing as its own
 * change, not as a side effect of one.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fakeBaseQuery<string>(),
  tagTypes,
  endpoints: () => ({}),
});
