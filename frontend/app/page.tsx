import { redirect } from "next/navigation";
import { paths } from "@constants/index";

/**
 * `/` has no page of its own. It cannot decide where to send someone — the role
 * lives in `sessionStorage`, which only exists in the browser — so it hands off
 * to `/login`, whose `GuestGuard` forwards a signed-in user to the home for
 * their role.
 */
export default function RootPage() {
  redirect(paths.login);
}
