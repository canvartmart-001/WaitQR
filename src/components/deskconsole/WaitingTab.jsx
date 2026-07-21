import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function WaitingTab({ filteredWaiting, now, serviceName, desks, deskWord, theme }) {
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const rowBackground = withAlpha(surfaceTheme.fontColor, "08");
  const calledBackground = withAlpha(surfaceTheme.fontColor, "12");

  if (filteredWaiting.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        Queue is empty.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
      {filteredWaiting.map((t, i) => (
        <div
          key={t.id}
          className="flex items-center gap-3 rounded-lg border px-3 py-3"
          style={{
            borderColor: surfaceTheme.borderColor,
            background: t._isCalled ? calledBackground : rowBackground,
            borderRadius: surfaceTheme.radius,
          }}
        >
          <div
            className="qp-ticket-face flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xl font-semibold leading-none"
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              color: surfaceTheme.fontColor,
              borderColor: surfaceTheme.borderColor,
              background: withAlpha(surfaceTheme.accentColor, "1f"),
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="qp-ticket-face text-sm font-semibold shrink-0" style={{ color: surfaceTheme.fontColor, fontVariantNumeric: "tabular-nums" }}>
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
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {t._isCalled && (
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider shrink-0"
                    style={{ background: withAlpha(surfaceTheme.fontColor, "12") }}
                  >
                    <span style={{ color: C.amber }}>Called</span>
                    <span className="ml-1" style={{ color: surfaceTheme.fontColor }}>
                      {desks.find((d) => d.id === t._calledFromDeskId)?.name || deskWord}
                    </span>
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
        </div>
      ))}
    </div>
  );
}
