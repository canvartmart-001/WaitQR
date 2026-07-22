import { Trash2, Undo2, X } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function AbsentTab({ filteredAbsent, desks = [], now, serviceName, recallAbsent, removeAbsent, askConfirm, theme }) {
  const surfaceTheme = {
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const rowBackground = withAlpha(surfaceTheme.fontColor, "08");

  if (filteredAbsent.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        No absents.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
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
          rowBackground={rowBackground}
        />
      ))}
    </div>
  );
}

function AbsentRow({ ticket: t, desks, now, serviceName, recallAbsent, removeAbsent, askConfirm, surfaceTheme, mutedColor, faintColor, rowBackground }) {
  const recallDesk = desks.find((desk) => String(desk.id) === String(t.skippedFromDesk));
  const recallDisabled = !recallAbsent || !recallDesk || Boolean(recallDesk.current);
  const confirmRemove = () => {
    askConfirm?.(
      "Delete absent ticket?",
      `Delete absent ticket ${t.label}${t.name ? ` for ${t.name}` : ""}? This cannot be recalled afterward.`,
      () => removeAbsent(t.id),
      { confirmLabel: "Delete", variant: "destructive" }
    );
  };

  return (
    <div className="rounded-lg px-3 py-3 border" style={{ borderColor: surfaceTheme.borderColor, background: rowBackground, borderRadius: surfaceTheme.radius }}>
      <div className="flex items-start gap-3 mb-2">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.coralSoft }}>
          <X size={16} style={{ color: C.coral }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="qp-mono text-sm font-semibold shrink-0" style={{ color: C.coral }}>
                {t.label}
              </span>
              <span className="text-sm font-medium truncate" style={{ color: surfaceTheme.fontColor }}>
                {t.name}
              </span>
            </div>
            <span className="text-xs qp-mono shrink-0" style={{ color: faintColor }}>
              {elapsedLabel(now - t.skippedAt)} ago
            </span>
          </div>
          <div className="text-xs mt-1 truncate" style={{ color: mutedColor }}>
            {t.phone} · {serviceName(t.serviceId)}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-12">
        <button
          onClick={() => recallAbsent(t.id)}
          disabled={recallDisabled}
          title={recallDisabled ? "Counter must be free before recall" : "Recall ticket"}
          className="qp-focusable flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border disabled:cursor-not-allowed disabled:opacity-35"
          style={{ borderColor: C.amber, color: C.amber, borderRadius: surfaceTheme.radius }}
        >
          <Undo2 size={12} /> Recall
        </button>
        <button onClick={confirmRemove} className="qp-focusable p-1.5 rounded-md border shrink-0 sm:ml-auto" style={{ borderColor: surfaceTheme.borderColor, color: faintColor, background: withAlpha(surfaceTheme.fontColor, "12"), borderRadius: surfaceTheme.radius }}>
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
