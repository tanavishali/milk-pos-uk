"use client";

import { LuX } from "react-icons/lu";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@utils/libs/cn";

type Size = "sm" | "md" | "lg" | "receipt";

// Widths from the redesign: min(480px, 94vw) for a record, 680px for the
// wizard, 520px for a receipt.
const sizes: Record<Size, string> = {
  sm: "sm:max-w-[420px]",
  md: "sm:max-w-[480px]",
  lg: "sm:max-w-[680px]",
  receipt: "sm:max-w-[520px]",
};

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface ModalProps {
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Sticky action row; stays visible while the body scrolls. */
  footer?: ReactNode;
  size?: Size;
  /** Extra controls beside the close button, e.g. the receipt's Print. */
  headerActions?: ReactNode;
  /** Marks the header/footer as `data-no-print` so only the body prints. */
  printable?: boolean;
  /** Fills the viewport height on mobile — for the wizard's long lists. */
  tall?: boolean;
}

/**
 * A bottom sheet on mobile and a centred dialog from `sm` up — the same
 * component, because it is the same dialog with a different anchor.
 *
 * Escape closes, the scrim closes, body scroll is locked while open, focus is
 * trapped inside and returned to whatever opened it. None of that is visible in
 * a screenshot, which is exactly why it belongs here once rather than in each of
 * the six modals that use it.
 *
 * There is no `open` prop: mounting the dialog is what opens it. Callers render
 * `{isOpen && <Modal ... />}`, which means a form inside starts from fresh state
 * every time instead of needing an effect to reset itself.
 */
export function Modal({
  onClose,
  title,
  children,
  footer,
  size = "md",
  headerActions,
  printable = false,
  tall = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember the opener before focus moves into the dialog, and restore it on
  // unmount — otherwise focus falls to <body> and keyboard users lose their place.
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;

    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    return () => openerRef.current?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const nodes = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      ).filter((node) => node.offsetParent !== null);
      if (nodes.length === 0) return;

      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[#0f1720]/55 p-0 backdrop-blur-[4px] sm:items-center sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          // No padding on the panel: each band supplies its own, so the header
          // and footer rules run edge to edge like the redesign's.
          "animate-modal-pop bg-surface rounded-t-card-lg sm:rounded-card-lg flex w-full flex-col shadow-modal outline-none sm:my-auto",
          tall ? "h-[92vh] sm:h-auto sm:max-h-[90vh]" : "max-h-[90vh]",
          sizes[size],
        )}
      >
        <header
          className="border-border-subtle flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4 sm:px-[26px] sm:py-[22px]"
          data-no-print={printable ? "" : undefined}
        >
          <h3 className="text-foreground-strong font-display truncate text-base font-bold sm:text-[17px]">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="text-foreground-subtle hover:text-foreground-body rounded-control-sm p-1 transition-colors"
            >
              <LuX className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-[26px] sm:py-6">
          {children}
        </div>

        {footer ? (
          <footer
            className="border-border-subtle flex shrink-0 gap-3 border-t px-5 py-4 sm:px-[26px] sm:py-[18px]"
            data-no-print={printable ? "" : undefined}
          >
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
