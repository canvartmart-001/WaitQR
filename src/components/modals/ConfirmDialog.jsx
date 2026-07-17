import { AlertTriangle, Lock, Unlock } from "lucide-react";
import { C } from "../../lib/theme";

export function ConfirmDialog({ confirmAction, onCancel, onConfirm }) {
  if (!confirmAction) return null;
  const isSuccess = confirmAction.variant === "success";
  const toneBg = isSuccess ? C.tealSoft : C.coralSoft;
  const toneColor = isSuccess ? C.teal : C.coral;
  const Icon = isSuccess ? Unlock : Lock;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="qp-modal rounded-xl border p-5 max-w-sm w-full"
        style={{ background: C.ink800, borderColor: C.hair }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: toneBg }}
          >
            <Icon size={16} style={{ color: toneColor }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: toneColor }}>
            {confirmAction.title}
          </h3>
        </div>
        <p className="text-sm mb-4 leading-relaxed" style={{ color: C.textMuted }}>
          {confirmAction.message}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="qp-focusable text-xs px-3 py-2 rounded-md border"
            style={{ borderColor: C.ink600, color: C.textMuted }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="qp-focusable text-xs px-3 py-2 rounded-md font-medium"
            style={{ background: isSuccess ? C.teal : C.coral, color: C.paper }}
          >
            {confirmAction.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
