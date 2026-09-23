import type { CloseRoundBookResult, RoundBook } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

/**
 * Round books, served by the NestJS API.
 *
 * Every read is tagged with `Order` and `Payment` as well as `RoundBook`. An
 * open book's figures are computed from the ledger on each read, so a bill
 * raised or cash recorded anywhere changes them without any book being
 * written — a cache keyed only on books would keep showing last hour's week.
 */
export const roundBooksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** The round's open book, with live figures and the pre-close checklist. */
    getCurrentRoundBook: build.query<RoundBook, string>({
      queryFn: (roundId) =>
        queryFor(() =>
          request<RoundBook>(
            `/round-books/current/${encodeURIComponent(roundId)}`,
          ),
        ),
      providesTags: [tags.RoundBook, tags.Order, tags.Payment],
    }),

    /** The round's books, newest week first, without statements. */
    getRoundBooks: build.query<RoundBook[], string>({
      queryFn: (roundId) =>
        queryFor(() =>
          request<RoundBook[]>(
            `/round-books?roundId=${encodeURIComponent(roundId)}`,
          ),
        ),
      providesTags: [tags.RoundBook, tags.Order, tags.Payment],
    }),

    /** One book with a statement per customer. */
    getRoundBook: build.query<RoundBook, string>({
      queryFn: (code) =>
        queryFor(() =>
          request<RoundBook>(`/round-books/${encodeURIComponent(code)}`),
        ),
      providesTags: [tags.RoundBook, tags.Order, tags.Payment],
    }),

    /**
     * Close a book, open the next week, and raise next week's bills.
     *
     * `idempotencyKey` is minted once per dialog, not per click: a close that
     * times out and is pressed again replays the first answer from the server
     * instead of being refused as "already closed".
     */
    closeRoundBook: build.mutation<
      CloseRoundBookResult,
      { code: string; idempotencyKey: string; excludeCustomerIds: string[] }
    >({
      queryFn: ({ code, idempotencyKey, excludeCustomerIds }) =>
        queryFor(() =>
          request<CloseRoundBookResult>(
            `/round-books/${encodeURIComponent(code)}/close`,
            {
              method: "POST",
              headers: { "Idempotency-Key": idempotencyKey },
              body: JSON.stringify({ excludeCustomerIds }),
            },
          ),
        ),
      // The close raises next week's bills and draws their stock down, so the
      // orders, the products and the dashboard are all stale when it lands.
      invalidatesTags: [
        tags.RoundBook,
        tags.Order,
        tags.Product,
        tags.DashboardMetrics,
      ],
    }),
  }),
});

export const {
  useGetCurrentRoundBookQuery,
  useGetRoundBooksQuery,
  useGetRoundBookQuery,
  useCloseRoundBookMutation,
} = roundBooksApi;
