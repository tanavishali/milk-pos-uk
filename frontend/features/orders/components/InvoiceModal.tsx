"use client";

import {
  LuCheck,
  LuDownload,
  LuHandCoins,
  LuPrinter,
  LuTriangleAlert,
} from "react-icons/lu";
import { useState } from "react";
import type { Order } from "@app-types/index";
import { Modal } from "@components/ui/modals";
import { Loader } from "@components/ui/states";
import { PaymentStatus, WEEKDAYS, WEEKDAY_SHORT } from "@enums/index";
import { APP_NAME, DEFAULT_POS_SETTINGS } from "@constants/index";
import { formatCurrency } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";
import { reportError } from "@utils/libs/reportError";
import { downloadPdf } from "@utils/libs/pdf";
import { buildReceiptPdf, receiptFilename } from "../utils/receiptPdf";

interface InvoiceModalProps {
  order: Order;
  /** Opens the collection dialog — the driver's next action at the door. */
  onCollect?: () => void;
  onClose: () => void;
}

/**
 * Thermal receipt. `data-print-root` is what the print rules in `globals.css`
 * key off: everything else on the page is hidden, this subtree is not.
 *
 * Line prices come from the order, never from the product's current sale price —
 * a receipt has to keep saying what was actually charged.
 */
/** Idle, building the file, done, or unable to. */
type SaveState = "idle" | "working" | "saved" | "failed";

const saveStates: Record<
  SaveState,
  { label: string; className: string; icon: "download" | "check" | "alert" }
> = {
  idle: {
    label: "Save",
    className: "border-border text-foreground-body hover:bg-surface-muted",
    icon: "download",
  },
  working: {
    label: "Preparing...",
    className: "border-border text-foreground-muted",
    icon: "download",
  },
  saved: {
    label: "Saved",
    className: "border-success-ring bg-success-soft text-success-text",
    icon: "check",
  },
  failed: {
    label: "Failed",
    className: "border-danger-ring bg-danger-soft text-danger-text",
    icon: "alert",
  },
};

export function InvoiceModal({ order, onCollect, onClose }: InvoiceModalProps) {
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const state = saveStates[saveState];

  const save = () => {
    if (saveState === "working") return;
    setSaveState("working");

    // Deferred by a tick so the spinner paints first. Building the PDF is
    // synchronous: called straight from the handler it holds the main thread
    // from the click until the download starts, and the button never gets to
    // show that anything happened.
    window.setTimeout(() => {
      try {
        downloadPdf(receiptFilename(order), buildReceiptPdf(order));
        // Confirms the click landed — a browser download gives no visible
        // feedback of its own when it goes straight to the downloads folder.
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 2000);
      } catch (error) {
        reportError(error, "saveReceiptPdf");
        setSaveState("failed");
        window.setTimeout(() => setSaveState("idle"), 3000);
      }
    }, 0);
  };

  /**
   * Lines grouped under the day they go out on, in round order. A line with no
   * day (a one-off sale) falls into a single unlabelled group, so a receipt for
   * a walk-in looks exactly as it did before days existed.
   */
  const groups = (() => {
    const withDay = WEEKDAYS.map((day) => ({
      day,
      lines: order.items.filter((l) => l.day === day),
    })).filter((g) => g.lines.length > 0);

    const undated = order.items.filter((l) => !l.day);
    return undated.length > 0
      ? [...withDay, { day: undefined, lines: undated }]
      : withDay;
  })();

  const grouped = groups.length > 1 || groups[0]?.day !== undefined;

  return (
    <Modal
      onClose={onClose}
      title="Point of Sales Receipt"
      size="receipt"
      printable
      headerActions={
        <>
          {onCollect ? (
            <button
              type="button"
              onClick={onCollect}
              aria-label="Collect payment"
              title="Collect payment"
              className="rounded-control-sm press-scale border-border text-foreground-body hover:bg-surface-muted flex items-center gap-1 border px-3 py-1.5 text-xs font-bold transition-colors"
            >
              <LuHandCoins className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Collect</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={save}
            aria-label={state.label}
            title={state.label}
            disabled={saveState === "working"}
            aria-busy={saveState === "working" || undefined}
            className={cn(
              "rounded-control-sm press-scale flex items-center gap-1 border px-3 py-1.5 text-xs font-bold transition-colors",
              state.className,
            )}
          >
            {saveState === "working" ? (
              <Loader size="xs" className="h-3.5 w-3.5" />
            ) : state.icon === "check" ? (
              <LuCheck className="h-3.5 w-3.5" aria-hidden />
            ) : state.icon === "alert" ? (
              <LuTriangleAlert className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <LuDownload className="h-3.5 w-3.5" aria-hidden />
            )}
            <span className="hidden sm:inline">{state.label}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            aria-label="Print"
            title="Print"
            className="bg-accent text-foreground-on-accent rounded-control-sm press-scale flex items-center gap-1 px-3 py-1.5 text-xs font-bold"
          >
            <LuPrinter className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Print</span>
          </button>
        </>
      }
    >
      <div
        data-print-root
        className="bg-surface space-y-2.5 p-1 font-mono text-micro sm:text-label"
      >
        <div className="border-border border-b border-dashed pb-2 text-center">
          <h2 className="text-foreground-strong text-xs font-black uppercase">
            {APP_NAME} POS Terminal
          </h2>
          <p className="text-nano text-foreground-muted">
            Receipt Confirmation
          </p>
          <p className="text-nano text-foreground-subtle mt-0.5">
            {order.date}
          </p>
        </div>

        <dl className="text-micro space-y-0.5">
          <div className="flex gap-1">
            <dt className="font-bold">TXN:</dt>
            <dd>{order.id}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-bold">Customer:</dt>
            <dd className="truncate">{order.customer.name}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-bold">Phone:</dt>
            <dd>{order.customer.phone}</dd>
          </div>
          {/* The delivery address. Deliberately wraps instead of truncating —
              this is the line the courier drives to, so a clipped address is a
              failed delivery. */}
          <div className="flex gap-1">
            <dt className="shrink-0 font-bold">Address:</dt>
            <dd className="wrap-break-word">
              {order.customer.address}
              {order.customer.postcode ? ` — ${order.customer.postcode}` : ""}
            </dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-bold">Courier:</dt>
            <dd className="truncate">{order.courier}</dd>
          </div>
          <div className="flex gap-1">
            <dt className="font-bold">Status:</dt>
            <dd
              className={cn(
                "font-bold",
                order.status === PaymentStatus.Paid
                  ? "text-success-text"
                  : "text-warning-text",
              )}
            >
              {order.status}
            </dd>
          </div>
        </dl>

        <table className="border-border text-micro w-full border-t border-b border-dashed py-1">
          <thead>
            <tr className="text-foreground-body text-left">
              <th scope="col" className="py-0.5 font-bold">
                Item
              </th>
              <th scope="col" className="py-0.5 text-center font-bold">
                Qty
              </th>
              <th scope="col" className="py-0.5 text-right font-bold">
                Price
              </th>
              <th scope="col" className="py-0.5 text-right font-bold">
                Total
              </th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody
              key={group.day ?? "once"}
              className="divide-border-subtle divide-y"
            >
              {/* A day heading only when there is more than one thing to
                  separate — a single-day receipt does not need a label. */}
              {grouped ? (
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="text-foreground-strong pt-1.5 pb-0.5 text-left font-bold uppercase"
                  >
                    {group.day ? WEEKDAY_SHORT[group.day] : "One-off"}
                  </th>
                </tr>
              ) : null}
              {group.lines.map((line) => (
                // Keyed by day and product: the same item can appear on two
                // days, and a bare productId would collide.
                <tr key={`${group.day ?? "once"}-${line.productId}`}>
                  <td className="py-0.5 pr-1">{line.name}</td>
                  <td className="py-0.5 text-center">{line.qty}</td>
                  <td className="py-0.5 text-right">
                    {formatCurrency(line.price)}
                  </td>
                  <td className="py-0.5 text-right">
                    {formatCurrency(line.qty * line.price)}
                  </td>
                </tr>
              ))}
              {grouped ? (
                <tr>
                  <td colSpan={3} className="py-0.5 text-right font-bold">
                    {group.day ? WEEKDAY_SHORT[group.day] : "One-off"} subtotal
                  </td>
                  <td className="py-0.5 text-right font-bold">
                    {formatCurrency(
                      group.lines.reduce((n, l) => n + l.qty * l.price, 0),
                    )}
                  </td>
                </tr>
              ) : null}
            </tbody>
          ))}
        </table>

        {/* Five lines, the shape a round docket has always had: what was
            delivered, what was already owed, what that comes to, what the
            customer handed over, and what is still on the account. A single
            "total" would hide which part of it is an old debt. */}
        <div className="space-y-0.5 pt-0.5">
          <div className="flex items-center justify-between">
            <span>This delivery:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Previous balance:</span>
            <span>
              {order.previousBalance > 0
                ? formatCurrency(order.previousBalance)
                : "NIL"}
            </span>
          </div>
          <div className="border-border flex items-center justify-between border-t border-dashed pt-1 text-xs font-black">
            <span>TOTAL DUE:</span>
            <span>{formatCurrency(order.grandTotal)}</span>
          </div>
          <div className="flex items-center justify-between pt-0.5">
            <span>Received:</span>
            <span>
              {order.receivedAtDelivery > 0
                ? formatCurrency(order.receivedAtDelivery)
                : "NIL"}
            </span>
          </div>
          {/* The account balance as it stands now, not as it stood when this
              printed — a reprint should tell the truth about today. */}
          <div className="flex items-center justify-between font-bold">
            <span>Balance now:</span>
            <span>
              {order.customerBalance > 0
                ? formatCurrency(order.customerBalance)
                : "NIL"}
            </span>
          </div>
        </div>

        <p className="text-nano text-foreground-subtle border-border border-t border-dashed pt-1.5 text-center">
          {DEFAULT_POS_SETTINGS.receiptNote}
        </p>
      </div>
    </Modal>
  );
}
