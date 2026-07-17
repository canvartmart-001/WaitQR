import { Trash2, Undo2, X } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

export function AbsentTab({ filteredAbsent, now, serviceName, returnToQueue, removeAbsent }) {
  if (filteredAbsent.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: C.textFaint }}>
        No absents.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
      {filteredAbsent.map((t) => (
        <div key={t.id} className="rounded-lg px-3 py-3 border" style={{ borderColor: C.ink700 }}>
          <div className="flex items-start gap-3 mb-2">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.coralSoft }}>
              <X size={16} style={{ color: C.coral }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="qp-mono text-sm font-semibold shrink-0" style={{ color: t.type === "priority" ? C.coral : C.amber }}>
                    {t.label}
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: C.textLight }}>
                    {t.name}
                  </span>
                </div>
                <span className="text-xs qp-mono shrink-0" style={{ color: C.textFaint }}>
                  {elapsedLabel(now - t.skippedAt)} ago
                </span>
              </div>
              <div className="text-xs mt-1 truncate" style={{ color: C.textMuted }}>
                {t.phone} · {serviceName(t.serviceId)}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pl-12">
            <button onClick={() => returnToQueue(t.id, "general")} className="qp-focusable flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border" style={{ borderColor: C.amber, color: C.amber }}>
              <Undo2 size={12} /> General
            </button>
            <button onClick={() => returnToQueue(t.id, "priority")} className="qp-focusable flex items-center gap-1 text-[11px] px-2 py-1.5 rounded-md border" style={{ borderColor: C.coral, color: C.coral }}>
              <Undo2 size={12} /> Priority
            </button>
            <button onClick={() => removeAbsent(t.id)} className="qp-focusable p-1.5 rounded-md border shrink-0 sm:ml-auto" style={{ borderColor: C.ink600, color: C.textFaint }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
