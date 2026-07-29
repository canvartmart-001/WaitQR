import { Trash2, Undo2, X } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function AbsentTab({ filteredAbsent, desks = [], now, serviceName, recallAbsent, removeAbsent, askConfirm, theme }) {
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");

  if (filteredAbsent.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        No absents.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pb-1">
      {filteredAbsent.map((t) => (
        <AbsentRow
          key={t.id}
          ticket={t}
          desks={desks}
          now={now}
          serviceName={serviceName}
          recallAbsent={recallAbsent}
          removeAbsent={removeAbsent}
          askConfirm={askConfirm}
          surfaceTheme={surfaceTheme}
          mutedColor={mutedColor}
          faintColor={faintColor}
        />
      ))}
    </div>
  );
}

function AbsentRow({ ticket: t, desks, now, serviceName, recallAbsent, removeAbsent, askConfirm, surfaceTheme, mutedColor, faintColor }) {
  const recallDesk = desks.find((desk) => String(desk.id) === String(t.skippedFromDesk));
  const recallDisabled = !recallAbsent || !recallDesk;
  const absentMeta = [
    t.createdAt ? `Joined ${elapsedLabel(now - t.createdAt)} ago` : null,
    t.skippedAt ? `Called ${elapsedLabel(now - t.skippedAt)} ago` : null,
  ].filter(Boolean).join(" | ");
  const confirmRemove = () => {
    askConfirm?.(
      "Delete absent ticket?",
      `Permanently delete absent ticket ${t.label}${t.name ? ` for ${t.name}` : ""}? This cannot be undone.`,
      () => removeAbsent(t.id),
      { confirmLabel: "Delete", variant: "destructive", icon: "trash" }
    );
  };

  return (
    <div className="rounded-lg px-3 py-3 border" style={{ borderColor: surfaceTheme.borderColor, background: "transparent", borderRadius: surfaceTheme.radius }}>
      <div className="flex items-start gap-3 mb-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: C.coralSoft }}>
          <X size={16} style={{ color: C.coral }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <span className="qp-mono block truncate text-lg font-semibold leading-tight" style={{ color: C.coral }}>
                {t.label}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={() => recallAbsent(t.id)}
                disabled={recallDisabled}
                title={recallDisabled ? "Counter unavailable" : "Recall ticket"}
                aria-label="Recall ticket"
                className="qp-focusable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35"
                style={{ color: C.amber, background: C.amberSoft, borderRadius: surfaceTheme.radius }}
              >
                <Undo2 size={13} />
                <span>Recall</span>
              </button>
              <button
                onClick={confirmRemove}
                title="Delete ticket"
                aria-label="Delete ticket"
                className="qp-focusable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold"
                style={{ color: C.coral, background: C.coralSoft, borderRadius: surfaceTheme.radius }}
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
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
          </div>
          {absentMeta ? (
            <div className="text-[10px] mt-1 truncate qp-mono" style={{ color: faintColor }}>
              {absentMeta}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
