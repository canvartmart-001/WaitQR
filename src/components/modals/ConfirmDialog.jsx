import { Lock, Trash2, Undo2, Unlock } from "lucide-react";
import { C } from "../../lib/theme";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

export function ConfirmDialog({ confirmAction, onCancel, onConfirm, theme }) {
  if (!confirmAction) return null;
  const isSuccess = confirmAction.variant === "success";
  const isDestructive = confirmAction.variant === "destructive";
  const isWarning = confirmAction.variant === "warning";
  const colors = {
    bgColor: theme?.bgColor || C.ink800,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.hair,
    radius: theme?.radius || 12,
    themeMode: theme?.themeMode || "Dark",
  };
  const isLight = colors.themeMode === "Light" || String(colors.fontColor).toLowerCase() === "#0f172a";
  const modalBg = isLight
    ? colors.bgColor
    : `color-mix(in srgb, ${colors.bgColor} 84%, ${colors.fontColor} 16%)`;
  const toneBg = isSuccess ? C.tealSoft : isWarning ? C.amberSoft : C.coralSoft;
  const toneColor = isSuccess ? C.teal : isWarning ? C.amber : C.coral;
  const Icon = isSuccess ? Unlock : isDestructive ? Trash2 : isWarning ? Undo2 : Lock;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onCancel}
    >
      <div
        className="qp-modal p-5 max-w-sm w-full"
        style={{
          background: modalBg,
          borderRadius: colors.radius * 1.4,
          boxShadow: isLight ? "0 18px 45px rgba(15,23,42,0.16)" : "0 22px 60px rgba(0,0,0,0.45)",
        }}
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
        <p className="text-sm mb-4 leading-relaxed" style={{ color: withAlpha(colors.fontColor, "b3") }}>
          {confirmAction.message}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="qp-focusable text-xs px-3 py-2 rounded-md"
            style={{
              background: withAlpha(colors.fontColor, isLight ? "0d" : "12"),
              color: withAlpha(colors.fontColor, "b3"),
              boxShadow: `inset 0 0 0 1px ${withAlpha(colors.fontColor, isLight ? "14" : "1f")}`,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="qp-focusable text-xs px-3 py-2 rounded-md font-medium"
            style={{ background: isSuccess ? C.teal : isWarning ? C.amber : C.coral, color: C.paper }}
          >
            {confirmAction.confirmLabel || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
