"use client";

import type { Courier } from "@app-types/index";
import { FormField, Select } from "@components/ui/fields";
import { inputClass } from "@components/ui/fields/inputClass";
import { WEEKDAY_SHORT } from "@enums/index";
import { formatCurrency } from "@utils/helper/format";
import { ONE_OFF, type OrderWizardController } from "../hooks/useOrderWizard";

export function WizardDispatchStep({
  couriers,
  wizard,
}: {
  couriers: Courier[];
  wizard: OrderWizardController;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-foreground-body text-xs font-extrabold">
          Step 3: Dispatch
        </h4>
        {/* No payment method here on purpose: the bill is raised before the van
            leaves, and what the customer hands over is only known at the door.
            It is recorded against the delivery afterwards. */}
        <p className="text-micro text-foreground-subtle">
          Who delivers it. Payment is recorded at the door.
        </p>
      </div>

      <FormField label="Select Delivery Courier" htmlFor="wizard-courier" required>
        <Select
          id="wizard-courier"
          value={wizard.courierId}
          onChange={(event) => wizard.setCourierId(event.target.value)}
          // The empty option still reads "Select a courier" rather than
          // "Unassigned": it is the prompt to choose, not a choice.
          placeholder="Select a courier"
          // Value is the id, not the name: the order scopes a driver's own
          // deliveries by id, and two couriers can share a name.
          options={couriers.map((c) => ({
            value: c.id,
            label: `${c.name} (${c.phone})`,
          }))}
        />
      </FormField>

      <FormField label="Delivery Charge" htmlFor="wizard-delivery-charge">
        <input
          id="wizard-delivery-charge"
          type="number"
          min="0"
          step="0.01"
          value={wizard.deliveryCharge}
          onChange={(event) => {
            const value = Number.parseFloat(event.target.value);
            wizard.setDeliveryCharge(Number.isFinite(value) ? Math.max(0, value) : 0);
          }}
          className={inputClass()}
          placeholder="0.00"
        />
      </FormField>

      {/* The per-day breakdown, so what prints is visible before it prints.
          Empty days are omitted — a day with nothing on it is not a delivery. */}
      {wizard.isSplitByDay ? (
        <div className="border-border rounded-control divide-border-subtle divide-y border">
          {wizard.buckets
            .filter((bucket) => bucket.lines.length > 0)
            .map((bucket) => (
              <div key={bucket.day} className="p-2.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
                  <p className="text-foreground-strong text-xs font-bold">
                    {bucket.day === ONE_OFF
                      ? "One-off"
                      : WEEKDAY_SHORT[bucket.day]}
                  </p>
                  <p className="text-foreground-muted text-micro">
                    {bucket.itemCount} item{bucket.itemCount === 1 ? "" : "s"}
                    {" · "}
                    <strong className="text-foreground-body font-bold">
                      {formatCurrency(bucket.total)}
                    </strong>
                  </p>
                </div>
                <ul className="space-y-0.5">
                  {bucket.lines.map((line) => (
                    <li
                      key={line.productId}
                      className="text-foreground-muted flex justify-between gap-2 text-micro"
                    >
                      <span className="truncate">
                        {line.qty} &times; {line.name}
                      </span>
                      <span className="shrink-0">
                        {formatCurrency(line.qty * line.price)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      ) : null}

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
        {wizard.isSplitByDay ? (
          <div className="flex justify-between gap-2">
            <dt className="text-foreground-body">Delivery Days:</dt>
            <dd className="text-foreground font-bold">
              {wizard.buckets.filter((b) => b.lines.length > 0).length} of{" "}
              {wizard.days.length}
            </dd>
          </div>
        ) : null}
        {wizard.deliveryCharge > 0 ? (
          <div className="flex justify-between gap-2">
            <dt className="text-foreground-body">Delivery charge:</dt>
            <dd className="text-foreground font-bold">
              {formatCurrency(wizard.deliveryCharge)}
            </dd>
          </div>
        ) : null}
        <div className="border-border flex justify-between gap-2 border-t pt-1">
          <dt className="text-foreground-body">This delivery:</dt>
          <dd className="text-accent-text font-extrabold">
            {formatCurrency(wizard.total)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
