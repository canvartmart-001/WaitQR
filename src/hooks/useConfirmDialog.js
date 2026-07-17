import { useState } from "react";

/** A single confirmation modal is reused across the whole app (delete desk, delete service,
 * clear all data, etc.) rather than each destructive action building its own dialog. Callers
 * just describe what they want confirmed. */
export function useConfirmDialog() {
  const [confirmAction, setConfirmAction] = useState(null);

  const askConfirm = (title, message, onConfirm, options = {}) => {
    setConfirmAction({ title, message, onConfirm, ...options });
  };

  const closeConfirm = () => setConfirmAction(null);

  const runConfirm = () => {
    confirmAction?.onConfirm();
    setConfirmAction(null);
  };

  return { confirmAction, askConfirm, closeConfirm, runConfirm };
}
