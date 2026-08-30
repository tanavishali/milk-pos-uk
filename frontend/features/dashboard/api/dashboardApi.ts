import type { DashboardMetrics, Order } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDashboardMetrics: build.query<DashboardMetrics, void>({
      queryFn: () =>
        queryFor(() => request<DashboardMetrics>("/dashboard/metrics")),
      providesTags: [tags.DashboardMetrics],
    }),

    getRecentOrders: build.query<Order[], number | void>({
      queryFn: (limit) =>
        queryFor(() =>
          request<Order[]>(`/dashboard/recent?limit=${limit ?? 4}`),
        ),
      providesTags: [tags.Order],
    }),
  }),
});

export const { useGetDashboardMetricsQuery, useGetRecentOrdersQuery } =
  dashboardApi;
