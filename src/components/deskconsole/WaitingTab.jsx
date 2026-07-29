import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";
import { UserRoundCheck } from "lucide-react";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

function estimatedWaitLabel(ticket) {
  const minutes = Number(ticket?.estimatedWaitMinutes ?? ticket?.estTime ?? ticket?.estimatedWait);
  if (!Number.isFinite(minutes) || minutes <= 0) return "--";
  return elapsedLabel(minutes * 60000);
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
  const nextCallableId = queuedWaiting[0]?.id || null;

  if (filteredWaiting.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        Queue is empty.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pb-1">
      {filteredWaiting.map((t, i) => {
        const isActive = Boolean(t._activeStatus);
        const canCall = !isActive && selectedDesk && nextCallableId != null && String(t.id) === String(nextCallableId);
        return (
        <div
          key={t.id}
          className="flex items-start gap-3 rounded-lg border px-3 py-3"
          style={{
            borderColor: surfaceTheme.borderColor,
            background: "transparent",
            borderRadius: surfaceTheme.radius,
          }}
        >
          <div
            className="qp-ticket-face flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold leading-none"
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              color: surfaceTheme.accentColor,
              background: withAlpha(surfaceTheme.accentColor, "1f"),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {isActive ? t.label : i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <div className="min-w-0">
                <span className="qp-ticket-face block truncate text-lg font-semibold leading-tight" style={{ color: surfaceTheme.accentColor, fontVariantNumeric: "tabular-nums" }}>
                  {t.label}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {isActive && (
                  <span className="text-[10px] shrink-0" style={{ color: faintColor }}>
                    {desks.find((desk) => String(desk.id) === String(t._activeFromDeskId))?.name || deskWord}
                  </span>
                )}
                {canCall ? (
                  <button
                    type="button"
                    onClick={() => callTicket?.(selectedDesk.id, t.id)}
                    className="qp-focusable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold"
                    style={{ color: surfaceTheme.accentColor, background: withAlpha(surfaceTheme.accentColor, "16"), borderRadius: surfaceTheme.radius }}
                    title="Call Next"
                    aria-label="Call Next"
                  >
                    <UserRoundCheck size={13} />
                    <span>Call Next</span>
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-1 grid gap-0.5">
              <div className="min-w-0 truncate text-sm font-medium leading-tight" style={{ color: surfaceTheme.fontColor }}>
                {t.name}
              </div>
              <div className="text-xs truncate" style={{ color: mutedColor }}>
                {t.phone}
              </div>
              <div className="text-sm font-normal truncate" style={{ color: withAlpha(surfaceTheme.fontColor, "cc") }}>
                {serviceName(t.serviceId)}
              </div>
              <div className="qp-ticket-face text-[10px] truncate" style={{ color: faintColor, fontVariantNumeric: "tabular-nums" }}>
                Joined {elapsedLabel(now - t.createdAt)} ago | Estimated wait {estimatedWaitLabel(t)}
              </div>
              <div className="flex flex-wrap gap-1">
                {t.type === "priority" && (
                  <span className="w-fit text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: C.coralSoft, color: C.coral }}>
                    Priority
                  </span>
                )}
                {isActive && (
                  <span className="w-fit text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: t._activeStatus === "serving" ? C.tealSoft : C.amberSoft, color: t._activeStatus === "serving" ? C.teal : C.amber }}>
                    {t._activeStatus === "serving" ? "Serving" : "Called"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
      })}
    </div>
  );
}
