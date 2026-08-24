"use client";

import type { Courier } from "@app-types/index";
import { FormField, Select } from "@components/ui/fields";
import { PaymentType } from "@enums/index";
import { formatCurrency } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";
import type { OrderWizardController } from "../hooks/useOrderWizard";

const PAYMENT_OPTIONS = [
  {
    value: PaymentType.Paid,
    label: "Cash / Paid",
    tone: "text-foreground-body",
  },
  {
    value: PaymentType.OnCredit,
    label: "On Credit",
    tone: "text-warning-text",
  },
] as const;

export function WizardDispatchStep({
  couriers,
  wizard,
}: {
  couriers: Courier[];
  wizard: OrderWizardController;
}) {
  return (
    <div className="space-y-3">
      <h4 className="text-foreground-body text-xs font-extrabold">
        Step 3: Dispatch &amp; Payment Mode
      </h4>

      <FormField label="Select Delivery Courier" htmlFor="wizard-courier">
        <Select
          id="wizard-courier"
          value={wizard.courier}
          onChange={(event) => wizard.setCourier(event.target.value)}
          placeholder="Unassigned"
          options={couriers.map((c) => ({
            value: c.name,
            label: `${c.name} (${c.phone})`,
          }))}
        />
      </FormField>

      <fieldset>
        <legend className="text-micro text-foreground-body mb-0.5 block font-bold">
          Payment Method
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_OPTIONS.map((option) => {
            const checked = wizard.paymentType === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "rounded-control flex cursor-pointer items-center gap-2 border p-2.5 transition-colors",
                  checked
                    ? "border-accent bg-accent-soft"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                <input
                  type="radio"
                  name="paymentType"
                  value={option.value}
                  checked={checked}
                  onChange={() => wizard.setPaymentType(option.value)}
                  className="accent-accent"
                />
                <span className={cn("text-xs font-bold", option.tone)}>
                  {option.label}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <dl className="bg-surface-muted border-border rounded-control space-y-1 border p-2.5 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">Customer:</dt>
          <dd className="text-foreground truncate font-bold">
            {wizard.customer?.name ?? "-"}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-foreground-body">Item Count:</dt>
          <dd className="text-foreground font-bold">{wizard.itemCount}</dd>
        </div>
        <div className="border-border flex justify-between gap-2 border-t pt-1">
          <dt className="text-foreground-body">Grand Total:</dt>
          <dd className="text-accent-text font-extrabold">
            {formatCurrency(wizard.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
