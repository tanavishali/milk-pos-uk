"use client";

import { Button } from "../buttons/Button";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Replaces the source app's `window.confirm`, which cannot be styled, blocks the
 * main thread, and is suppressible by the browser.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <div className="flex flex-1 justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-foreground-body text-xs">{message}</p>
    </Modal>
  );
}
