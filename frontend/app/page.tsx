import { redirect } from "next/navigation";
import { paths } from "@constants/index";

/** The portal has no landing page of its own; `/` is the dashboard. */
export default function RootPage() {
  redirect(paths.dashboard);
}
