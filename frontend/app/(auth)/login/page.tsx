import type { Metadata } from "next";
import { LoginView } from "@features/auth/index";

export const metadata: Metadata = { title: "Sign In" };

export default function Page() {
  return <LoginView />;
}
