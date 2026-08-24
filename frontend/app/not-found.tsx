import Link from "next/link";
import { paths } from "@constants/index";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="bg-surface border-border rounded-card w-full max-w-sm border p-6 text-center shadow-card">
        <h1 className="text-foreground-strong text-sm font-extrabold">
          Page not found
        </h1>
        <p className="text-foreground-muted mt-1 text-xs">
          That route does not exist in this terminal.
        </p>
        <Link
          href={paths.dashboard}
          className="bg-accent text-foreground-on-accent rounded-control mt-4 inline-block px-4 py-2 text-xs font-bold"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
