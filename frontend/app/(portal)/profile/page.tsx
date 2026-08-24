import type { Metadata } from "next";
import { ProfileView } from "@features/profile/index";

export const metadata: Metadata = { title: "User Manager" };

export default function Page() {
  return <ProfileView />;
}
