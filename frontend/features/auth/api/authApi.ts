import type { AuthUser, Credentials } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import { mockDb } from "@services/mock/index";

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    signIn: build.mutation<AuthUser, Credentials>({
      queryFn: (credentials) => {
        try {
          return { data: mockDb.auth.signIn(credentials) };
        } catch (error) {
          // Surfaced verbatim to the form; the mock deliberately does not say
          // which half was wrong.
          return { error: (error as Error).message };
        }
      },
      invalidatesTags: [tags.Session],
    }),
  }),
});

export const { useSignInMutation } = authApi;
