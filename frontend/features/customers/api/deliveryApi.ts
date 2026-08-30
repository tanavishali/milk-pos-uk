import type { Weekday } from "@enums/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";

/** A named round, as `GET /delivery/rounds` returns it. */
export interface DeliveryRound {
  id: string;
  label: string;
  days: Weekday[];
}

/** A weekday with its display labels, as `GET /delivery/days` returns it. */
export interface DeliveryDay {
  value: Weekday;
  short: string;
  initial: string;
}

/**
 * Read-only reference data for the round planner.
 *
 * `keepUnusedDataFor` is generous because neither list changes while the
 * terminal is open — refetching them on every mount would be pure noise.
 */
export const deliveryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDeliveryRounds: build.query<DeliveryRound[], void>({
      queryFn: () => queryFor(() => request<DeliveryRound[]>("/delivery/rounds")),
      keepUnusedDataFor: 3600,
    }),

    getDeliveryDays: build.query<DeliveryDay[], void>({
      queryFn: () => queryFor(() => request<DeliveryDay[]>("/delivery/days")),
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const { useGetDeliveryRoundsQuery, useGetDeliveryDaysQuery } =
  deliveryApi;
