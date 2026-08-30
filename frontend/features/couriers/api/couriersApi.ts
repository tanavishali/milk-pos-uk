import type { Courier, CourierDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

/**
 * The dispatch roster, served by the NestJS API.
 *
 * `password` on the draft is write-only: the form collects it, `POST /couriers`
 * turns it into the driver's sign-in account, and no response ever carries it
 * back — `Courier` has no field to put it in.
 */
export const couriersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCouriers: build.query<Courier[], void>({
      queryFn: () => queryFor(() => request<Courier[]>("/couriers")),
      providesTags: [tags.Courier],
    }),

    createCourier: build.mutation<Courier, CourierDraft>({
      queryFn: (draft) =>
        queryFor(() =>
          request<Courier>("/couriers", {
            method: "POST",
            body: JSON.stringify(draft),
          }),
        ),
      invalidatesTags: [tags.Courier, tags.DashboardMetrics],
    }),

    updateCourier: build.mutation<Courier, { id: string; draft: CourierDraft }>(
      {
        queryFn: ({ id, draft }) =>
          queryFor(() =>
            request<Courier>(`/couriers/${id}`, {
              method: "PATCH",
              // An empty password means "keep the current one", and the API
              // reads it that way — the edit form sends one when untouched.
              body: JSON.stringify(draft),
            }),
          ),
        invalidatesTags: [tags.Courier],
      },
    ),

    deleteCourier: build.mutation<string, string>({
      queryFn: (id) =>
        queryFor(async () => {
          const { id: deleted } = await request<{ id: string }>(
            `/couriers/${id}`,
            { method: "DELETE" },
          );
          return deleted;
        }),
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
