"use client";

import { Button } from "../buttons/Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  /** What the confirm button says while the operation runs. */
  pendingLabel?: string;
  /** The mutation's `isLoading`. Holds the dialog open until it settles. */
  loading?: boolean;
  /** Shown in place of closing when the operation failed. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replaces the source app's `window.confirm`, which cannot be styled, blocks the
 * main thread, and is suppressible by the browser.
 *
 * While `loading`, the dialog refuses to close — Escape, the scrim and the X all
 * go nowhere. A delete that is already in flight cannot be called off, so
 * letting the dialog vanish would only hide the outcome; the record would still
 * disappear a moment later with nothing to explain why.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  pendingLabel = "Deleting...",
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const close = () => {
    if (!loading) onCancel();
  };

  return (
    <Modal
      onClose={close}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={loading}
            loadingLabel={pendingLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-foreground-body text-xs">{message}</p>

      {error ? (
        <p
          role="alert"
          className="bg-danger-soft text-danger-text border-danger-ring rounded-control mt-3 border px-3 py-2 text-xs font-semibold"
        >
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
