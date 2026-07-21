import { Check } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function ServedTab({ filteredServed, now, serviceName, desks, deskWord, theme }) {
  const surfaceTheme = {
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const rowBackground = withAlpha(surfaceTheme.fontColor, "08");

  if (filteredServed.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        No completed tickets.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
      {filteredServed.map((e, i) => (
        <div key={`${e.label}-${e.completedAt}-${i}`} className="flex items-start gap-3 rounded-lg px-3 py-3 border" style={{ borderColor: surfaceTheme.borderColor, background: rowBackground, borderRadius: surfaceTheme.radius }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealSoft }}>
            <Check size={16} style={{ color: C.teal }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="qp-mono text-sm font-semibold shrink-0" style={{ color: e.type === "priority" ? C.coral : C.amber }}>
                  {e.label}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: surfaceTheme.fontColor }}>
                  {e.name}
                </span>
              </div>
              <span className="text-xs qp-mono shrink-0" style={{ color: faintColor }}>
                {elapsedLabel(now - e.completedAt)} ago
              </span>
            </div>
            <div className="text-xs mt-1 truncate" style={{ color: mutedColor }}>
              {e.phone} · {serviceName(e.serviceId)}
            </div>
            <div className="text-[10px] mt-0.5 truncate qp-mono" style={{ color: faintColor }}>
              {desks.find((d) => d.id === e.deskId)?.name || deskWord} · waited {elapsedLabel(e.waitMs)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
