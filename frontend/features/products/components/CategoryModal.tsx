"use client";

import { useState } from "react";
import { Button } from "@components/ui/buttons";
import { FormField, inputClass } from "@components/ui/fields";
import { Modal } from "@components/ui/modals";
import { useCreateCategoryMutation } from "../api/productsApi";

/**
 * Opened from two places — the sidebar and the products toolbar — so it is
 * mounted by the shell rather than by either opener.
 */
export function CategoryModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [createCategory, { isLoading }] = useCreateCategoryMutation();

  const submit = async () => {
    const trimmed = name.trim();
    // Creating a duplicate is a no-op server-side; closing quietly is the right
    // outcome either way.
    if (trimmed) await createCategory(trimmed).unwrap();
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Add Item Category"
      size="sm"
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" disabled={isLoading}>
            Save Category
          </Button>
        </div>
      }
    >
      <form
        id="category-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormField label="Category Title" htmlFor="cat-name" required>
          <input
            id="cat-name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Pastries, Dairy"
            className={inputClass()}
          />
        </FormField>
      </form>
    </Modal>
  );
}
