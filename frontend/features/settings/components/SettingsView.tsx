"use client";

import { useState } from "react";
import { Card } from "@components/ui/cards";
import { Button } from "@components/ui/buttons";
import { FormField, inputClass } from "@components/ui/fields";
import { DEFAULT_POS_SETTINGS } from "@constants/index";

/**
 * Terminal configuration. Local-only for now: there is no settings endpoint, so
 * Save reports success without persisting. Wiring it means one mutation in
 * `features/settings/api/` and swapping `useState` for the query result.
 */
export function SettingsView() {
  // Explicit <string>: the constants are `as const`, so inference would pin
  // these to their literal values and reject any edit.
  const [storeName, setStoreName] = useState<string>(
    DEFAULT_POS_SETTINGS.storeName,
  );
  const [receiptNote, setReceiptNote] = useState<string>(
    DEFAULT_POS_SETTINGS.receiptNote,
  );
  const [saved, setSaved] = useState(false);

  return (
    <Card className="max-w-xl space-y-3 p-4">
      <h3 className="text-foreground-strong text-xs font-extrabold sm:text-sm">
        Point of Sales Configuration
      </h3>

      <form
        className="space-y-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          setSaved(true);
        }}
      >
        <FormField label="Store / Terminal Name" htmlFor="store-name">
          <input
            id="store-name"
            value={storeName}
            onChange={(event) => {
              setStoreName(event.target.value);
              setSaved(false);
            }}
            className={inputClass()}
          />
        </FormField>

        <FormField label="Thermal Receipt Note" htmlFor="receipt-note">
          <textarea
            id="receipt-note"
            rows={3}
            value={receiptNote}
            onChange={(event) => {
              setReceiptNote(event.target.value);
              setSaved(false);
            }}
            className={inputClass()}
          />
        </FormField>

        <div className="flex items-center gap-3">
          <Button type="submit">Save Configuration</Button>
          {saved ? (
            <span role="status" className="text-success-text text-xs font-bold">
              Saved for this session
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
