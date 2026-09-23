"use client";

import { LuPrinter, LuReceiptText } from "react-icons/lu";
import type { Order } from "@app-types/index";
import { DetailModal } from "@components/ui/modals";
import { PaymentStatus } from "@enums/index";
import { formatCurrency } from "@utils/helper/format";

const totalUnits = (order: Order) =>
  order.items.reduce((sum, line) => sum + line.qty, 0);

/** Part-paid reads neutral here: the dialog's own Status field names it in full. */
const statusTone = (
  status: PaymentStatus,
): "success" | "warning" | "neutral" => {
  if (status === PaymentStatus.Paid) return "success";
  return status === PaymentStatus.Partial ? "neutral" : "warning";
};

interface OrderDetailModalProps {
  order: Order;
  /** Opens the printable receipt — the dialog's one action. */
  onReceipt: () => void;
  onClose: () => void;
}

/**
 * The row's detail view: who the transaction belongs to, then the three facts
 * the registry no longer has room to print in full — courier, quantity, status.
 *
 * The receipt is reached from here rather than from the row, so the Actions
 * column stays two buttons wide: you open the transaction, then print it.
 */
export function OrderDetailModal({
  order,
  onReceipt,
  onClose,
}: OrderDetailModalProps) {
  return (
    <DetailModal
      title="Transaction Detail"
      heading={order.customer.name}
      meta={order.id}
      icon={LuReceiptText}
      badges={[{ label: order.status, tone: statusTone(order.status) }]}
      fields={[
        { label: "Courier", value: order.courier },
        { label: "Qty", value: `${totalUnits(order)} pcs` },
        {
          label: "Status",
          // Cash handed over at this door came off the registry row with the
          // Status column, so it rides along with the status it qualifies —
          // "Paid" alone does not say where the money was taken.
          value:
            order.receivedAtDelivery > 0
              ? `${order.status} — ${formatCurrency(
                  order.receivedAtDelivery,
                )} taken here`
              : order.status,
        },
      ]}
      onClose={onClose}
      action={{ label: "Receipt", icon: LuPrinter, onClick: onReceipt }}
    />
  );
}
