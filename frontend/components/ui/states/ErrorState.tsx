"use client";

import { LuRotateCw, LuTriangleAlert } from "react-icons/lu";
import { Button } from "../buttons/Button";

interface ErrorStateProps {
  /** What failed, in the user's terms — "Couldn't load customers". */
  title: string;
  /** The underlying reason, when there is one worth showing. */
  detail?: string;
  onRetry?: () => void;
  /** Borderless variant for use inside a card that already has a frame. */
  inset?: boolean;
}

/**
 * Shown when a read fails.
 *
 * This exists because the alternative is worse than a crash: with `data = []` as
 * a fallback, a failed request falls straight through to the empty state and the
 * app confidently reports "No customers found" when the truth is "we could not
 * load them". That is a lie with no way out of it — this says what happened and
 * offers the retry.
 */
export function ErrorState({
  title,
  detail,
  onRetry,
  inset = false,
}: ErrorStateProps) {
  const body = (
    <div className="flex flex-col items-center gap-2 text-center">
      <span className="bg-danger-soft text-danger rounded-card flex h-9 w-9 items-center justify-center">
        <LuTriangleAlert className="h-4 w-4" aria-hidden />
      </span>
      <div>
        <p className="text-foreground-strong text-xs font-extrabold">{title}</p>
        <p className="text-foreground-subtle mt-0.5 text-xs">
          {detail ?? "The request did not complete. Nothing has been changed."}
        </p>
      </div>
      {onRetry ? (
        <Button
          variant="secondary"
          size="sm"
          icon={LuRotateCw}
          onClick={onRetry}
        >
          Try again
        </Button>
      ) : null}
    </div>
  );

  if (inset) {
    return (
      <div
        role="alert"
        className="border-danger-ring rounded-control border border-dashed p-4"
      >
        {body}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="bg-surface border-border rounded-card border p-8 shadow-card"
    >
      {body}
    </div>
  );
}
