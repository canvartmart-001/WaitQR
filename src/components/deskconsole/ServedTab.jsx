import { Check, Undo2 } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function ServedTab({ filteredServed, now, serviceName, desks, deskWord, recallServed, askConfirm, theme }) {
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
        <ServedRow
          key={`${e.label}-${e.completedAt}-${i}`}
          entry={e}
          now={now}
          serviceName={serviceName}
          desks={desks}
          deskWord={deskWord}
          recallServed={recallServed}
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

function ServedRow({ entry: e, now, serviceName, desks, deskWord, recallServed, askConfirm, surfaceTheme, mutedColor, faintColor, rowBackground }) {
  const recallDesk = desks.find((desk) => String(desk.id) === String(e.deskId));
  const recallDisabled = !recallServed || !recallDesk;
  const servedByName = e.servedByMemberName || "";
  const confirmRecall = () => {
    if (!askConfirm) {
      recallServed(e.id);
      return;
    }

    askConfirm?.(
      "Recall served ticket?",
      `Recall served ticket ${e.label}${e.name ? ` for ${e.name}` : ""}? This removes it from served totals and timing history until it is completed again.`,
      () => recallServed(e.id),
      { confirmLabel: "Recall", variant: "warning" }
    );
  };

  return (
    <div className="rounded-lg px-3 py-3 border" style={{ borderColor: surfaceTheme.borderColor, background: rowBackground, borderRadius: surfaceTheme.radius }}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealSoft }}>
          <Check size={16} style={{ color: C.teal }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="qp-mono text-sm font-semibold shrink-0" style={{ color: C.teal }}>
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
            {recallDesk?.name || deskWord} · waited {elapsedLabel(e.waitMs)}
          </div>
          {servedByName ? (
            <div className="text-[10px] mt-0.5 truncate" style={{ color: faintColor }}>
              Served by {servedByName}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-12">
        <button
          onClick={confirmRecall}
          disabled={recallDisabled}
          title={recallDisabled ? "Counter unavailable" : "Recall ticket"}
          className="qp-focusable flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border disabled:cursor-not-allowed disabled:opacity-35"
          style={{ borderColor: C.amber, color: C.amber, borderRadius: surfaceTheme.radius }}
        >
          <Undo2 size={12} /> Recall
        </button>
      </div>
    </div>
  );
}
