import type { Payment, PaymentDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  WRITE_LATENCY_MS,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

export const paymentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** One customer's payment history, newest first. */
    getPayments: build.query<Payment[], string>({
      queryFn: async (customerId) => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.payments.list(customerId) };
      },
      providesTags: [tags.Payment],
    }),

    /**
     * Record money received.
     *
     * Invalidates orders too: a payment changes every bill's status and the
     * customer's balance, none of which is stored on an order — so the order
     * cache is stale the moment this lands.
     */
    recordPayment: build.mutation<Payment, PaymentDraft>({
      queryFn: async (draft) => {
        await delay(WRITE_LATENCY_MS);
        try {
          return { data: mockDb.payments.create(draft) };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
      invalidatesTags: [tags.Payment, tags.Order, tags.DashboardMetrics],
    }),

    /** Reverse a mis-keyed collection. */
    deletePayment: build.mutation<string, string>({
      queryFn: async (id) => {
        await delay(WRITE_LATENCY_MS);
        try {
          return { data: mockDb.payments.remove(id) };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
      invalidatesTags: [tags.Payment, tags.Order, tags.DashboardMetrics],
    }),
  }),
});

export const {
  useGetPaymentsQuery,
  useRecordPaymentMutation,
  useDeletePaymentMutation,
} = paymentsApi;
