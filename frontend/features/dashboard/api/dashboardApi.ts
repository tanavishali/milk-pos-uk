import type { DashboardMetrics, Order } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      queryFn: async () => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.orders.metrics() };
      },
      providesTags: [tags.DashboardMetrics],
    }),

    getRecentOrders: build.query<Order[], number | void>({
      queryFn: async (limit) => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.orders.recent(limit ?? 4) };
      },
      providesTags: [tags.Order],
    }),
  }),
});

export const { useGetDashboardMetricsQuery, useGetRecentOrdersQuery } =
  dashboardApi;
