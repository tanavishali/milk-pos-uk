"use client";

import { useState } from "react";
import type { Product, ProductDraft } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { FormField, Select, inputClass } from "@components/ui/fields";
import { Modal } from "@components/ui/modals";
import {
  useCreateProductMutation,
  useGetCategoriesQuery,
  useUpdateProductMutation,
} from "../api/productsApi";

/** Numeric fields are held as strings so a half-typed "1." doesn't become NaN. */
interface ProductForm {
  name: string;
  category: string;
  retailPrice: string;
  salePrice: string;
  quantity: string;
}

const EMPTY: ProductForm = {
  name: "",
  category: "",
  retailPrice: "",
  salePrice: "",
  quantity: "",
};

interface ProductModalProps {
  onClose: () => void;
  product?: Product;
}

/** Mounted only while open, so the initial state below IS the reset. */
export function ProductModal({ onClose, product }: ProductModalProps) {
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createProduct, createState] = useCreateProductMutation();
  const [updateProduct, updateState] = useUpdateProductMutation();

  const [form, setForm] = useState<ProductForm>(() =>
    product
      ? {
          name: product.name,
          category: product.category,
          retailPrice: String(product.retailPrice),
          salePrice: String(product.salePrice),
          quantity: String(product.quantity),
        }
      : EMPTY,
  );

  // On create, `category` starts empty and the first category stands in until
  // the user picks one. Derived rather than seeded into state, because the
  // category list arrives from a query that may not have resolved at mount.
  const category = form.category || categories[0] || "";

  const saving = createState.isLoading || updateState.isLoading;

  const set = <K extends keyof ProductForm>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const draft: ProductDraft = {
      name: form.name,
      category,
      retailPrice: Number.parseFloat(form.retailPrice) || 0,
      salePrice: Number.parseFloat(form.salePrice) || 0,
      quantity: Number.parseInt(form.quantity, 10) || 0,
    };

    if (product) {
      await updateProduct({ id: product.id, draft }).unwrap();
    } else {
      await createProduct(draft).unwrap();
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={product ? "Edit Master Item" : "Add Master Item"}
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            loading={saving}
            loadingLabel="Saving..."
          >
            Save Item
          </Button>
        </div>
      }
    >
      <form
        id="product-form"
        className="space-y-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormField label="Item Name" htmlFor="prod-name" required>
          <input
            id="prod-name"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        <FormField label="Category" htmlFor="prod-category" required>
          <Select
            id="prod-category"
            required
            value={category}
            onChange={(e) => set("category", e.target.value)}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <FormField label="Retail Price (€)" htmlFor="prod-retail" required>
            <input
              id="prod-retail"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.retailPrice}
              onChange={(e) => set("retailPrice", e.target.value)}
              className={inputClass()}
            />
          </FormField>

          <FormField label="Sale Price (€)" htmlFor="prod-sale" required>
            <input
              id="prod-sale"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.salePrice}
              onChange={(e) => set("salePrice", e.target.value)}
              className={inputClass()}
            />
          </FormField>
        </div>

        <FormField label="Quantity in Stock" htmlFor="prod-qty" required>
          <input
            id="prod-qty"
            type="number"
            min="0"
            required
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
            className={inputClass()}
          />
        </FormField>
      </form>
    </Modal>
  );
}
