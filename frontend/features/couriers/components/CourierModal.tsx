"use client";

import { useState } from "react";
import type { Courier, CourierDraft } from "@app-types/index";
import { Button } from "@components/ui/buttons";
import { FormField, inputClass } from "@components/ui/fields";
import { Modal } from "@components/ui/modals";
import {
  useCreateCourierMutation,
  useUpdateCourierMutation,
} from "../api/couriersApi";

const EMPTY: CourierDraft = {
  name: "",
  phone: "",
  idcard: "",
  email: "",
  area: "",
  address: "",
  password: "",
};

interface CourierModalProps {
  onClose: () => void;
  courier?: Courier;
}

/** Mounted only while open, so the initial state below IS the reset. */
export function CourierModal({ onClose, courier }: CourierModalProps) {
  const [draft, setDraft] = useState<CourierDraft>(() =>
    courier
      ? {
          name: courier.name,
          phone: courier.phone,
          idcard: courier.idcard,
          email: courier.email,
          area: courier.area,
          address: courier.address,
          // Left blank on edit rather than prefilled with a fake mask: a masked
          // value that submits would silently set the password to literal
          // asterisks.
          password: "",
        }
      : EMPTY,
  );
  const [createCourier, createState] = useCreateCourierMutation();
  const [updateCourier, updateState] = useUpdateCourierMutation();

  const saving = createState.isLoading || updateState.isLoading;
  const editing = courier !== undefined;

  const set = <K extends keyof CourierDraft>(key: K, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (courier) {
      await updateCourier({ id: courier.id, draft }).unwrap();
    } else {
      await createCourier(draft).unwrap();
    }
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title={editing ? "Edit Courier" : "Register Courier"}
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="courier-form"
            loading={saving}
            loadingLabel="Saving..."
          >
            Save Courier
          </Button>
        </div>
      }
    >
      <form
        id="courier-form"
        className="space-y-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <FormField label="Full Name" htmlFor="courier-name" required>
          <input
            id="courier-name"
            required
            value={draft.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <FormField label="Phone Number" htmlFor="courier-phone" required>
            <input
              id="courier-phone"
              type="tel"
              required
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass()}
            />
          </FormField>

          <FormField label="National ID" htmlFor="courier-idcard" required>
            <input
              id="courier-idcard"
              required
              value={draft.idcard}
              onChange={(e) => set("idcard", e.target.value)}
              className={inputClass()}
            />
          </FormField>
        </div>

        <FormField label="Email Address" htmlFor="courier-email" required>
          <input
            id="courier-email"
            type="email"
            required
            value={draft.email}
            onChange={(e) => set("email", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        <FormField
          label={editing ? "New Password" : "Password"}
          htmlFor="courier-password"
          required={!editing}
        >
          <input
            id="courier-password"
            type="password"
            required={!editing}
            autoComplete="new-password"
            placeholder={editing ? "Leave blank to keep current" : undefined}
            value={draft.password ?? ""}
            onChange={(e) => set("password", e.target.value)}
            className={inputClass()}
          />
        </FormField>

        {/* Above the address on purpose: dispatch reads the area first, and a
            round is assigned by patch long before anyone needs a house number. */}
        <FormField label="Area" htmlFor="courier-area" required>
          <textarea
            id="courier-area"
            required
            rows={2}
            value={draft.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="Which area this courier covers — e.g. Gulberg & Model Town"
            className={inputClass()}
          />
        </FormField>

        <FormField label="Address" htmlFor="courier-address" required>
          <textarea
            id="courier-address"
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
