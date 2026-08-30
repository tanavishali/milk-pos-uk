import type { AuthUser, Credentials } from "@app-types/index";
import { API_BASE_URL } from "@services/api/config";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import { writeToken } from "../utils/token";

/** The sign-in response: an `AuthUser` plus the bearer token. */
type SignInResponse = AuthUser & { accessToken: string };

const GENERIC_FAILURE = "Could not sign in. Try again.";

/**
 * Sign-in is the one endpoint already talking to the real backend; every other
 * feature still reads `mockDb` through its own `queryFn`.
 *
 * That is why this is a `queryFn` doing its own `fetch` rather than a `query`
 * over `fetchBaseQuery`: swapping `baseApi`'s base query would change the error
 * type for all eight feature modules at once, and they still return plain
 * strings. Converting them belongs with the endpoint that replaces each mock.
 */
export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    signIn: build.mutation<AuthUser, Credentials>({
      queryFn: async (credentials) => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });

          const body: unknown = await response.json();

          if (!response.ok) {
            // The API says "Incorrect email or password." for both a wrong
            // password and an unknown email, on purpose. Surfaced verbatim.
            const { message } = body as { message?: string | string[] };
            return {
              error: Array.isArray(message)
                ? message.join(" ")
                : (message ?? GENERIC_FAILURE),
            };
          }

          // The token is a credential, so it goes to its own store rather than
          // into Redux, where it would end up rendered or logged eventually.
          const { accessToken, ...user } = body as SignInResponse;
          writeToken(accessToken);

          return { data: user };
        } catch {
          // A thrown fetch is the network failing, not a rejected credential —
          // saying "incorrect password" here would be a lie.
          return { error: "Cannot reach the server. Check your connection." };
        }
      },
      invalidatesTags: [tags.Session],
    }),
  }),
});

export const { useSignInMutation } = authApi;
