import type { Customer, CustomerDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request, requestAll } from "@services/api/http";
import { tags } from "@services/api/tags";

/**
 * The customer directory, served by the NestJS API.
 *
 * The whole of `services/mock/` is gone; every registry and the ledger are
 * served by the API.
 */
export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomers: build.query<Customer[], void>({
      queryFn: () => queryFor(() => requestAll<Customer>("/customers")),
      providesTags: [tags.Customer],
    }),

    createCustomer: build.mutation<Customer, CustomerDraft>({
      queryFn: (draft) =>
        queryFor(() =>
          request<Customer>("/customers", {
            method: "POST",
            body: JSON.stringify(draft),
          }),
        ),
      invalidatesTags: [tags.Customer, tags.DashboardMetrics],
    }),

    updateCustomer: build.mutation<
      Customer,
      { id: string; draft: CustomerDraft }
    >({
      queryFn: ({ id, draft }) =>
        queryFor(() =>
          request<Customer>(`/customers/${id}`, {
            method: "PATCH",
            body: JSON.stringify(draft),
          }),
        ),
      invalidatesTags: [tags.Customer],
    }),

    /** Pause or resume: a paused customer gets no bill when the round closes. */
    setCustomerPaused: build.mutation<Customer, { id: string; paused: boolean }>({
      queryFn: ({ id, paused }) =>
        queryFor(() =>
          request<Customer>(`/customers/${id}/pause`, {
            method: "PATCH",
            body: JSON.stringify({ paused }),
          }),
        ),
      invalidatesTags: [tags.Customer],
    }),

    deleteCustomer: build.mutation<string, string>({
      queryFn: (id) =>
        queryFor(async () => {
          const { id: deleted } = await request<{ id: string }>(
            `/customers/${id}`,
            { method: "DELETE" },
          );
          return deleted;
        }),
      invalidatesTags: [tags.Customer, tags.DashboardMetrics],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useSetCustomerPausedMutation,
  useDeleteCustomerMutation,
} = customersApi;
