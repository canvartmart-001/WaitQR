import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";
import { Volume2 } from "lucide-react";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function WaitingTab({ filteredWaiting, queuedWaiting = [], selectedDesk, now, serviceName, desks = [], deskWord, callTicket, theme }) {
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const rowBackground = withAlpha(surfaceTheme.fontColor, "08");
  const nextCallableId = queuedWaiting[0]?.id || null;

  if (filteredWaiting.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        Queue is empty.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
      {filteredWaiting.map((t, i) => {
        const isActive = Boolean(t._activeStatus);
        const canCall = !isActive && selectedDesk && nextCallableId != null && String(t.id) === String(nextCallableId);
        return (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-lg border px-3 py-3"
          style={{
            borderColor: surfaceTheme.borderColor,
            background: rowBackground,
            borderRadius: surfaceTheme.radius,
          }}
        >
          <div
            className="qp-ticket-face flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xl font-semibold leading-none"
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              color: C.blue,
              borderColor: surfaceTheme.borderColor,
              background: withAlpha(surfaceTheme.accentColor, "1f"),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {isActive ? t.label : i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="qp-ticket-face text-sm font-semibold shrink-0" style={{ color: C.blue, fontVariantNumeric: "tabular-nums" }}>
                  {t.label}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: surfaceTheme.fontColor }}>
                  {t.name}
                </span>
                {t.type === "priority" && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: C.coralSoft, color: C.coral }}>
                    Priority
                  </span>
                )}
                {isActive && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: t._activeStatus === "serving" ? C.tealSoft : C.amberSoft, color: t._activeStatus === "serving" ? C.teal : C.amber }}>
                    {t._activeStatus === "serving" ? "Serving" : "Called"}
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {isActive && (
                  <span className="text-[10px] shrink-0" style={{ color: faintColor }}>
                    {desks.find((desk) => String(desk.id) === String(t._activeFromDeskId))?.name || deskWord}
                  </span>
                )}
                <span className="qp-ticket-face text-xs shrink-0" style={{ color: faintColor, fontVariantNumeric: "tabular-nums" }}>
                  {elapsedLabel(now - t.createdAt)}
                </span>
              </div>
            </div>
            <div className="text-xs mt-1 truncate" style={{ color: mutedColor }}>
              {t.phone} · {serviceName(t.serviceId)}
            </div>
          </div>
          {canCall ? (
            <button
              type="button"
              onClick={() => callTicket?.(selectedDesk.id, t.id)}
              className="qp-focusable flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-medium"
              style={{ borderColor: C.blue, color: C.blue, borderRadius: surfaceTheme.radius }}
              title="Call this ticket"
            >
              <Volume2 size={12} /> Call
            </button>
          ) : null}
        </div>
      );
      })}
    </div>
  );
}
