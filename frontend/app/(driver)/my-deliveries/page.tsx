import type { Metadata } from "next";
import { MyDeliveriesView } from "@features/driver/index";

export const metadata: Metadata = { title: "My Deliveries" };

export default function Page() {
  return <MyDeliveriesView />;
}
