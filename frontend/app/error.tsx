"use client";

import { useEffect } from "react";
import { reportError } from "@utils/libs/reportError";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => reportError(error, "app/error"), [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="bg-surface border-border rounded-card w-full max-w-sm border p-6 text-center shadow-card">
        <h1 className="text-foreground-strong text-sm font-extrabold">
          Something went wrong
        </h1>
        <p className="text-foreground-muted mt-1 text-xs">
          This screen failed to render. Retrying may be enough.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-foreground-on-accent rounded-control press-scale mt-4 px-4 py-2 text-xs font-bold"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
