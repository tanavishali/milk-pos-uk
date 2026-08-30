"use client";

import { useState } from "react";
import type { Customer, CustomerDraft } from "@app-types/index";
import type { Weekday } from "@enums/index";

import { Button } from "@components/ui/buttons";
import {
  DayPicker,
  FormField,
  Select,
  inputClass,
} from "@components/ui/fields";
import { Modal } from "@components/ui/modals";
import {
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
} from "../api/customersApi";
import { useGetDeliveryRoundsQuery } from "../api/deliveryApi";

const EMPTY: CustomerDraft = {
  name: "",
  phone: "",
  round: "",
  deliveryDays: [],
  email: "",
  area: "",
  address: "",
  postcode: "",
};

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
          round: customer.round,
          deliveryDays: customer.deliveryDays,
          email: customer.email,
          area: customer.area,
          address: customer.address,
          postcode: customer.postcode,
        }
      : EMPTY,
  );
  const [createCustomer, createState] = useCreateCustomerMutation();
  const [updateCustomer, updateState] = useUpdateCustomerMutation();
  // Served by `GET /delivery/rounds`, so the list the form offers and the ids
  // the API will accept are the same list.
  const { data: rounds = [] } = useGetDeliveryRoundsQuery();

  const saving = createState.isLoading || updateState.isLoading;

  const set = (
    key: "name" | "phone" | "email" | "area" | "address" | "postcode",
    value: string,
  ) => setDraft((prev) => ({ ...prev, [key]: value }));

  const setDays = (deliveryDays: Weekday[]) =>
    setDraft((prev) => ({ ...prev, deliveryDays }));

  /**
   * Choosing a round fills the day toggles from it, so the two cannot silently
   * disagree. The toggles stay editable afterwards — a one-off variation should
   * not require inventing a new round.
   */
  const setRound = (round: string) =>
    setDraft((prev) => ({
      ...prev,
      round,
      deliveryDays:
        rounds.find((r) => r.id === round)?.days ?? prev.deliveryDays,
    }));

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
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="customer-form"
            loading={saving}
            loadingLabel="Saving..."
          >
            Save Customer
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

        {/* Not required: a walk-in customer is on no round. */}
        <FormField label="Delivery Round" htmlFor="cust-round">
          <Select
            id="cust-round"
            value={draft.round}
            onChange={(e) => setRound(e.target.value)}
            placeholder="Select Round"
            options={rounds.map((r) => ({
              value: r.id,
              label: r.label,
            }))}
          />
        </FormField>

        <FormField label="Delivery Days" htmlFor="cust-days">
          <DayPicker value={draft.deliveryDays} onChange={setDays} />
        </FormField>

        <FormField label="Email Address" htmlFor="cust-email" required>
          <input
            id="cust-email"
            type="email"
            required
            autoComplete="email"
            placeholder="name@example.com"
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        {/* Above the address, as on the courier form: dispatch groups the round
            by area first and only needs the house number at the door. */}
        <FormField label="Area" htmlFor="cust-area" required>
          <textarea
            id="cust-area"
            required
            rows={2}
            value={draft.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="Delivery area — e.g. Model Town, Lahore"
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

        <FormField label="Post Code" htmlFor="cust-postcode" required>
          <input
            id="cust-postcode"
            required
            autoComplete="postal-code"
            placeholder="54000"
            value={draft.postcode}
            onChange={(e) => set("postcode", e.target.value)}
            className={inputClass()}
          />
        </FormField>
      </form>
    </Modal>
  );
}
