import type { Courier, CourierDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

export const couriersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCouriers: build.query<Courier[], void>({
      queryFn: async () => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.couriers.list() };
      },
      providesTags: [tags.Courier],
    }),

    createCourier: build.mutation<Courier, CourierDraft>({
      queryFn: (draft) => ({ data: mockDb.couriers.create(draft) }),
      invalidatesTags: [tags.Courier, tags.DashboardMetrics],
    }),

    updateCourier: build.mutation<Courier, { id: string; draft: CourierDraft }>({
      queryFn: ({ id, draft }) => ({ data: mockDb.couriers.update(id, draft) }),
      invalidatesTags: [tags.Courier],
    }),

    deleteCourier: build.mutation<string, string>({
      queryFn: (id) => ({ data: mockDb.couriers.remove(id) }),
      invalidatesTags: [tags.Courier, tags.DashboardMetrics],
    }),
  }),
});

export const {
  useGetCouriersQuery,
  useCreateCourierMutation,
  useUpdateCourierMutation,
  useDeleteCourierMutation,
} = couriersApi;
