"use client";

import { LuPrinter } from "react-icons/lu";
import type { Order } from "@app-types/index";
import { Modal } from "@components/ui/modals";
import { PaymentType } from "@enums/index";
import { APP_NAME, DEFAULT_POS_SETTINGS } from "@constants/index";
import { formatCurrency } from "@utils/helper/format";
import { cn } from "@utils/libs/cn";

interface InvoiceModalProps {
  order: Order;
  onClose: () => void;
}

/**
 * Thermal receipt. `data-print-root` is what the print rules in `globals.css`
 * key off: everything else on the page is hidden, this subtree is not.
 *
 * Line prices come from the order, never from the product's current sale price —
 * a receipt has to keep saying what was actually charged.
 */
export function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  return (
    <Modal
      onClose={onClose}
      title="Point of Sales Receipt"
      size="receipt"
      printable
      headerActions={
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-accent text-foreground-on-accent rounded-control-sm press-scale flex items-center gap-1 px-3 py-1.5 text-xs font-bold"
        >
          <LuPrinter className="h-3.5 w-3.5" aria-hidden />
          Print
        </button>
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
            <dd className="wrap-break-word">{order.customer.address}</dd>
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
                order.paymentType === PaymentType.OnCredit
                  ? "text-warning-text"
                  : "text-success-text",
              )}
            >
              {order.paymentType}
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
          <tbody className="divide-border-subtle divide-y">
            {order.items.map((line) => (
              <tr key={line.productId}>
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
          </tbody>
        </table>

        <div className="flex items-center justify-between pt-0.5 text-xs font-black">
          <span>TOTAL:</span>
          <span>{formatCurrency(order.total)}</span>
        </div>

        <p className="text-nano text-foreground-subtle border-border border-t border-dashed pt-1.5 text-center">
          {DEFAULT_POS_SETTINGS.receiptNote}
        </p>
      </div>
    </Modal>
  );
}
