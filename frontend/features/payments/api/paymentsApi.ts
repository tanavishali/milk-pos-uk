import type { Payment, PaymentDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** One customer's payment history, newest first. */
    getPayments: build.query<Payment[], string>({
      queryFn: (customerId) =>
        queryFor(() =>
          request<Payment[]>(
            `/payments?customerId=${encodeURIComponent(customerId)}`,
          ),
        ),
      providesTags: [tags.Payment],
    }),

    /**
     * Record money received.
     *
     * Invalidates orders too: a payment changes every affected bill's status
     * and the customer's balance, none of which is stored on an order — so the
     * order cache is stale the moment this lands.
     */
    recordPayment: build.mutation<Payment, PaymentDraft>({
      queryFn: (draft) =>
        queryFor(() =>
          request<Payment>("/payments", {
            method: "POST",
            body: JSON.stringify(draft),
          }),
        ),
      invalidatesTags: [tags.Payment, tags.Order, tags.DashboardMetrics],
    }),

    /** Reverse a mis-keyed collection. Balances and statuses follow on their own. */
    deletePayment: build.mutation<string, string>({
      queryFn: (id) =>
        queryFor(async () => {
          const { id: deleted } = await request<{ id: string }>(
            `/payments/${id}`,
            { method: "DELETE" },
          );
          return deleted;
        }),
      invalidatesTags: [tags.Payment, tags.Order, tags.DashboardMetrics],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useRecordPaymentMutation,
  useDeletePaymentMutation,
} = paymentsApi;
