import type { Order } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

export const driverApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * The signed-in courier's own deliveries.
     *
     * **Scoped from the session, not from the argument.** The mock took a
     * courier id because that is all a mock can do; `GET /orders/mine` reads
     * the id out of the bearer token instead, so asking for someone else's
     * work is not an option the API offers. The parameter is kept only as the
     * query's cache key — changing accounts must not reuse the cached list.
     */
    getMyDeliveries: build.query<Order[], string>({
      queryFn: () => queryFor(() => request<Order[]>("/orders/mine")),
      providesTags: [tags.Order],
    }),
  }),
});

export const { useGetMyDeliveriesQuery } = driverApi;
