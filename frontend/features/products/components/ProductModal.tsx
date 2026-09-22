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
  salePrice: string;
  quantity: string;
}

const EMPTY: ProductForm = {
  name: "",
  category: "",
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

  /**
   * A new item is only three facts. The count on the shelf is not among them
   * — the delivery has not arrived — so it is asked for on edit and not here.
   */
  const editing = product !== undefined;

  const set = <K extends keyof ProductForm>(key: K, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    const shared = {
      name: form.name,
      category,
      salePrice: Number.parseFloat(form.salePrice) || 0,
    };

    if (product) {
      const draft: ProductDraft = {
        ...shared,
        quantity: Number.parseInt(form.quantity, 10) || 0,
      };
      await updateProduct({ id: product.id, draft }).unwrap();
    } else {
      // The API starts stock at nothing.
      await createProduct(shared).unwrap();
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

        {/* One price. There is no list price to sit beside it. */}
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

        {/* Stock is set here and drawn down by orders; there is no other way to
            put units back on the shelf, which is why edit keeps the field. */}
        {editing && (
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
        )}
      </form>
    </Modal>
  );
}
