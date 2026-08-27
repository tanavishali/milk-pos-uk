import type { Customer, CustomerDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  WRITE_LATENCY_MS,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

/**
 * Endpoints run through `queryFn` against `mockDb` because there is no backend
 * yet. Swapping in a real API means turning each of these into a `query` — the
 * hooks below, and every call site, stay as they are.
 */
export const customersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomers: build.query<Customer[], void>({
      queryFn: async () => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.customers.list() };
      },
      providesTags: [tags.Customer],
    }),

    createCustomer: build.mutation<Customer, CustomerDraft>({
      queryFn: async (draft) => {
        await delay(WRITE_LATENCY_MS);
        return { data: mockDb.customers.create(draft) };
      },
      invalidatesTags: [tags.Customer, tags.DashboardMetrics],
    }),

    updateCustomer: build.mutation<
      Customer,
      { id: string; draft: CustomerDraft }
    >({
      queryFn: async ({ id, draft }) => {
        await delay(WRITE_LATENCY_MS);
        return { data: mockDb.customers.update(id, draft) };
      },
      invalidatesTags: [tags.Customer],
    }),

    deleteCustomer: build.mutation<string, string>({
      queryFn: async (id) => {
        await delay(WRITE_LATENCY_MS);
        return { data: mockDb.customers.remove(id) };
      },
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
