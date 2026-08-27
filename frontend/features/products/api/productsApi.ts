import type { Product, ProductDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { tags } from "@services/api/tags";
import {
  READ_FAILURE_MESSAGE,
  WRITE_LATENCY_MS,
  delay,
  mockDb,
  shouldFailRead,
} from "@services/mock/index";

export const productsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<Product[], void>({
      queryFn: async () => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.products.list() };
      },
      providesTags: [tags.Product],
    }),

    getCategories: build.query<string[], void>({
      queryFn: async () => {
        await delay();
        if (shouldFailRead()) return { error: READ_FAILURE_MESSAGE };
        return { data: mockDb.categories.list() };
      },
      providesTags: [tags.Category],
    }),

    createCategory: build.mutation<string[], string>({
      queryFn: async (name) => {
        await delay(WRITE_LATENCY_MS);
        return { data: mockDb.categories.create(name) };
      },
      invalidatesTags: [tags.Category],
    }),

    createProduct: build.mutation<Product, ProductDraft>({
      queryFn: async (draft) => {
        await delay(WRITE_LATENCY_MS);
        return { data: mockDb.products.create(draft) };
      },
      invalidatesTags: [tags.Product],
    }),

    updateProduct: build.mutation<Product, { id: string; draft: ProductDraft }>(
      {
        queryFn: async ({ id, draft }) => {
          await delay(WRITE_LATENCY_MS);
          return { data: mockDb.products.update(id, draft) };
        },
        invalidatesTags: [tags.Product],
      },
    ),

    deleteProduct: build.mutation<string, string>({
      queryFn: async (id) => {
        await delay(WRITE_LATENCY_MS);
        return { data: mockDb.products.remove(id) };
      },
      invalidatesTags: [tags.Product],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productsApi;
