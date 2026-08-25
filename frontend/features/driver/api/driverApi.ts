import type { Order } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

export const driverApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * One courier's deliveries.
     *
     * Takes the courier id as an argument because that is how a mock works. A
     * real API must scope this from the *authenticated session* instead — a
     * client-supplied id is a request to read someone else's work, and the
     * server has to refuse it.
     */
    getMyDeliveries: build.query<Order[], string>({
      queryFn: async (courierId) => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.orders.forCourier(courierId) };
      },
      providesTags: [tags.Order],
    }),
  }),
});

export const { useGetMyDeliveriesQuery } = driverApi;
