import type { Metadata } from "next";
import { OrdersView } from "@features/orders/index";

export const metadata: Metadata = { title: "Customer Transactions" };

export default function Page() {
  return <OrdersView />;
}
