import type { Metadata } from "next";
import { ProductsView } from "@features/products/index";

export const metadata: Metadata = { title: "Master Items" };

export default function Page() {
  return <ProductsView />;
}
