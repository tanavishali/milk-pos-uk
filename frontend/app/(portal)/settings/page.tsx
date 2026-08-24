import type { Metadata } from "next";
import { SettingsView } from "@features/settings/index";

export const metadata: Metadata = { title: "POS Settings" };

export default function Page() {
  return <SettingsView />;
}
