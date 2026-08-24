import type { Metadata } from "next";
import { CustomersView } from "@features/customers/index";

export const metadata: Metadata = { title: "Customers Directory" };

export default function Page() {
  return <CustomersView />;
}
