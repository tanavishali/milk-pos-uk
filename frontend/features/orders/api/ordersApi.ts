import type { Order, OrderDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getOrders: build.query<Order[], void>({
      queryFn: async () => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.orders.list() };
      },
      providesTags: [tags.Order],
    }),

    createOrder: build.mutation<Order, OrderDraft>({
      queryFn: (draft) => {
        try {
          return { data: mockDb.orders.create(draft) };
        } catch (error) {
          return { error: (error as Error).message };
        }
      },
      // Issuing an order draws down stock, so the product cache is stale too.
      invalidatesTags: [tags.Order, tags.Product, tags.DashboardMetrics],
    }),
  }),
});

export const { useGetOrdersQuery, useCreateOrderMutation } = ordersApi;
