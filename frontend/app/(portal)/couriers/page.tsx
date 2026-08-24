import type { Metadata } from "next";
import { CouriersView } from "@features/couriers/index";

export const metadata: Metadata = { title: "Couriers & Logistics" };

export default function Page() {
  return <CouriersView />;
}
