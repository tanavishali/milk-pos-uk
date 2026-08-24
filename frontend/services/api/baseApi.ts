import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { tagTypes } from "./tags";

/**
 * The single RTK Query root. Features add their endpoints with
 * `baseApi.injectEndpoints({...})` — never a second `createApi`, never a raw
 * `fetch`.
 *
 * `fakeBaseQuery` because there is no backend yet: every endpoint supplies a
 * `queryFn` that reads `mockDb`. Moving to a real API means swapping this for
 * `fetchBaseQuery({ baseUrl })` and converting each `queryFn` to a `query`.
 * Call sites do not change.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fakeBaseQuery<string>(),
  tagTypes,
  endpoints: () => ({}),
});
