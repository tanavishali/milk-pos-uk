import type { DashboardMetrics, Order, Product } from "@app-types/index";
import type { PaymentStatus } from "@enums/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

/** A customer who owes money, as `GET /dashboard/overview` ranks them. */
export interface Debtor {
  customerId: string;
  name: string;
  round: string;
  balance: number;
  openBills: number;
}

/** A bill with money still on it. */
export interface OpenBill {
  id: string;
  customerId: string;
  customerName: string;
  courier: string;
  status: PaymentStatus;
  total: number;
  /** What is left on this bill alone — never the door total. */
  remaining: number;
  date: string;
}

/** A capped list, and the count it stands for. */
export interface Panel<T> {
  rows: T[];
  total: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  debtors: Panel<Debtor>;
  openBills: Panel<OpenBill>;
  lowStock: Panel<Product>;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * The whole screen in one request.
     *
     * Previously the dashboard pulled every order and every product down and
     * worked the panels out in the browser. The server does it now, so the page
     * transfers four summary rows instead of the entire ledger.
     *
     * Tagged with `Order`, `Payment` and `Product` because it reads all three:
     * raising a bill, taking money, or editing stock each make it stale.
     */
    getDashboardOverview: build.query<DashboardOverview, number | void>({
      queryFn: (limit) =>
        queryFor(() =>
          request<DashboardOverview>(
            `/dashboard/overview?limit=${limit ?? 6}`,
          ),
        ),
      providesTags: [
        tags.DashboardMetrics,
        tags.Order,
        tags.Payment,
        tags.Product,
      ],
    }),

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

export const {
  useGetDashboardOverviewQuery,
  useGetDashboardMetricsQuery,
  useGetRecentOrdersQuery,
} = dashboardApi;
