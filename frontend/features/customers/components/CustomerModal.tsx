"use client";

import { useState } from "react";
import type { Customer, CustomerDraft } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { FormField, inputClass } from "@components/ui/fields";
import { Modal } from "@components/ui/modals";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "../api/customersApi";

const EMPTY: CustomerDraft = { name: "", phone: "", idcard: "", address: "" };

interface CustomerModalProps {
  onClose: () => void;
  /** Present means edit; absent means create. */
  customer?: Customer;
}

/** Mounted only while open, so the initial state below IS the reset. */
export function CustomerModal({ onClose, customer }: CustomerModalProps) {
  const [draft, setDraft] = useState<CustomerDraft>(() =>
    customer
      ? {
          name: customer.name,
          phone: customer.phone,
          idcard: customer.idcard,
          address: customer.address,
        }
      : EMPTY,
  );
  const [createCustomer, createState] = useCreateCustomerMutation();
  const [updateCustomer, updateState] = useUpdateCustomerMutation();

  const saving = createState.isLoading || updateState.isLoading;

  const set = <K extends keyof CustomerDraft>(key: K, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (customer) {
      await updateCustomer({ id: customer.id, draft }).unwrap();
    } else {
      await createCustomer(draft).unwrap();
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={customer ? "Edit Customer" : "Add New Customer"}
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" disabled={saving}>
            {saving ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      }
    >
      <form
        id="customer-form"
        className="space-y-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormField label="Customer Name" htmlFor="cust-name" required>
          <input
            id="cust-name"
            required
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        <FormField label="Phone Number" htmlFor="cust-phone" required>
          <input
            id="cust-phone"
            type="tel"
            required
            value={draft.phone}
            onChange={(e) => set("phone", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        <FormField label="National ID Card" htmlFor="cust-idcard" required>
          <input
            id="cust-idcard"
            required
            value={draft.idcard}
            onChange={(e) => set("idcard", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        <FormField label="Address" htmlFor="cust-address" required>
          <textarea
            id="cust-address"
            required
            rows={2}
            value={draft.address}
            onChange={(e) => set("address", e.target.value)}
            className={inputClass()}
          />
        </FormField>
      </form>
    </Modal>
  );
}
