import type { Product, ProductDraft } from "@app-types/index";
import { baseApi } from "@services/api/baseApi";
import { queryFor, request } from "@services/api/http";
import { tags } from "@services/api/tags";

/**
 * Master items and their categories, served by the NestJS API.
 *
 * The in-memory mock is gone entirely; the rows live in MongoDB.
 *
 * Prices cross the wire as decimal pounds, exactly as `Product` declares them.
 * The backend stores integer pence and converts at its DTO boundary, so no
 * conversion belongs here.
 */
export const productsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getProducts: build.query<Product[], void>({
      queryFn: () => queryFor(() => request<Product[]>("/products")),
      providesTags: [tags.Product],
    }),

    getCategories: build.query<string[], void>({
      queryFn: () => queryFor(() => request<string[]>("/categories")),
      providesTags: [tags.Category],
    }),

    /** Returns the whole list, and adding an existing name is a no-op. */
    createCategory: build.mutation<string[], string>({
      queryFn: (name) =>
        queryFor(() =>
          request<string[]>("/categories", {
            method: "POST",
            body: JSON.stringify({ name }),
          }),
        ),
      invalidatesTags: [tags.Category],
    }),

    createProduct: build.mutation<Product, ProductDraft>({
      queryFn: (draft) =>
        queryFor(() =>
          request<Product>("/products", {
            method: "POST",
            body: JSON.stringify(draft),
          }),
        ),
      invalidatesTags: [tags.Product],
    }),

    updateProduct: build.mutation<Product, { id: string; draft: ProductDraft }>(
      {
        queryFn: ({ id, draft }) =>
          queryFor(() =>
            request<Product>(`/products/${id}`, {
              method: "PATCH",
              body: JSON.stringify(draft),
            }),
          ),
        invalidatesTags: [tags.Product],
      },
    ),

    deleteProduct: build.mutation<string, string>({
      queryFn: (id) =>
        queryFor(async () => {
          const { id: deleted } = await request<{ id: string }>(
            `/products/${id}`,
            { method: "DELETE" },
          );
          return deleted;
        }),
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
