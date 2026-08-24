import type { IconType } from "react-icons";

interface EmptyStateProps {
  message: string;
  icon?: IconType;
  /** Dashed and borderless — for empty lists nested inside a card. */
  inset?: boolean;
}

export function EmptyState({
  message,
  icon: Icon,
  inset = false,
}: EmptyStateProps) {
  if (inset) {
    return (
      <div className="border-border text-foreground-subtle rounded-control border border-dashed py-6 text-center text-xs">
        {Icon ? (
          <Icon
            className="text-border-strong mx-auto mb-1 h-5 w-5"
            aria-hidden
          />
        ) : null}
        {message}
      </div>
    );
  }

  return (
    <div className="bg-surface border-border text-foreground-subtle rounded-card border p-8 text-center text-xs shadow-card">
      {Icon ? (
        <Icon className="text-border-strong mx-auto mb-2 h-6 w-6" aria-hidden />
      ) : null}
      {message}
    </div>
  );
}
