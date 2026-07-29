import { Check, Undo2 } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function ServedTab({ filteredServed, now, serviceName, desks, deskWord, recallServed, askConfirm, theme }) {
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");

  if (filteredServed.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        No completed tickets.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pb-1">
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
        />
      ))}
    </div>
  );
}

function ServedRow({ entry: e, now, serviceName, desks, deskWord, recallServed, askConfirm, surfaceTheme, mutedColor, faintColor }) {
  const recallDesk = desks.find((desk) => String(desk.id) === String(e.deskId));
  const recallDisabled = !recallServed || !recallDesk;
  const servedByName = e.servedByMemberName || "";
  const servedMeta = [
    recallDesk?.name || deskWord,
    servedByName ? `By ${servedByName}` : null,
    `Waited ${elapsedLabel(e.waitMs)}`,
    `${elapsedLabel(now - e.completedAt)} ago`,
  ].filter(Boolean).join(" | ");
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
    <div className="rounded-lg px-3 py-3 border" style={{ borderColor: surfaceTheme.borderColor, background: "transparent", borderRadius: surfaceTheme.radius }}>
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: C.tealSoft }}>
          <Check size={16} style={{ color: C.teal }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <div className="min-w-0">
              <span className="qp-mono block truncate text-lg font-semibold leading-tight" style={{ color: C.teal }}>
                {e.label}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                onClick={confirmRecall}
                disabled={recallDisabled}
                title={recallDisabled ? "Counter unavailable" : "Recall ticket"}
                aria-label="Recall ticket"
                className="qp-focusable inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35"
                style={{ color: C.amber, background: C.amberSoft, borderRadius: surfaceTheme.radius }}
              >
                <Undo2 size={13} />
                <span>Recall</span>
              </button>
            </div>
          </div>
          <div className="mt-1 grid gap-0.5">
            <div className="min-w-0 truncate text-sm font-medium leading-tight" style={{ color: surfaceTheme.fontColor }}>
              {e.name}
            </div>
            <div className="text-xs truncate" style={{ color: mutedColor }}>
              {e.phone}
            </div>
            <div className="text-sm font-normal truncate" style={{ color: withAlpha(surfaceTheme.fontColor, "cc") }}>
              {serviceName(e.serviceId)}
            </div>
          </div>
          <div className="text-[10px] mt-0.5 truncate qp-mono" style={{ color: faintColor }}>
            {servedMeta}
          </div>
        </div>
      </div>
    </div>
  );
}
