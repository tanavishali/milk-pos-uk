import type { Order, OrderDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

/**
 * Bills, served by the NestJS API.
 *
 * `settledAmount`, `status`, `receivedAtDelivery` and `customerBalance` arrive
 * computed from the payment ledger — none of them is stored on an order, which
 * is why recording a collection changes them without any order being written.
 */
export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query<Order[], void>({
      queryFn: () => queryFor(() => request<Order[]>("/orders")),
      providesTags: [tags.Order, tags.Payment],
    }),

    /**
     * What a customer still owes, and on which bills.
     *
     * Tagged with `Payment` as well as `Order`: recording a collection changes
     * this answer without touching a single order, so a cache keyed only on
     * orders would keep showing a balance that has just been paid.
     */
    getOutstanding: build.query<
      { orders: Order[]; total: number; paid: number },
      string
    >({
      queryFn: (customerId) =>
        queryFor(() =>
          request<{ orders: Order[]; total: number; paid: number }>(
            `/orders/outstanding/${customerId}`,
          ),
        ),
      providesTags: [tags.Order, tags.Payment],
    }),

    createOrder: build.mutation<Order, OrderDraft>({
      queryFn: (draft) =>
        queryFor(() =>
          request<Order>("/orders", {
            method: "POST",
            body: JSON.stringify(draft),
          }),
        ),
      // Issuing an order draws down stock in the same transaction, so the
      // product cache is stale the moment this lands.
      invalidatesTags: [tags.Order, tags.Product, tags.DashboardMetrics],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOutstandingQuery,
  useCreateOrderMutation,
} = ordersApi;
