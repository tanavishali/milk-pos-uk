import type { Customer, CustomerDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";
import { setKnownCustomers } from "@services/mock/knownCustomers";

/**
 * The customer directory, served by the NestJS API.
 *
 * `services/mock/customers.mock.ts` and `seed.customers.ts` are gone; the rows
 * live in MongoDB.
 *
 * Each successful read also hands the list to `knownCustomers` — the orders and
 * payments mocks still need to resolve a customer by id, and they cannot reach
 * the API themselves. That bridge goes when those endpoints are written.
 */
export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomers: build.query<Customer[], void>({
      queryFn: () =>
        queryFor(async () => {
          const customers = await request<Customer[]>("/customers");
          setKnownCustomers(customers);
          return customers;
        }),
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
  useDeleteCustomerMutation,
} = customersApi;
