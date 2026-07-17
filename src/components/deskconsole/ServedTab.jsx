import { Check } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

export function ServedTab({ filteredServed, now, serviceName, desks, deskWord }) {
  if (filteredServed.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: C.textFaint }}>
        No completed tickets.
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
      {filteredServed.map((e, i) => (
        <div key={`${e.label}-${e.completedAt}-${i}`} className="flex items-start gap-3 rounded-lg px-3 py-3 border" style={{ borderColor: C.ink700 }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.tealSoft }}>
            <Check size={16} style={{ color: C.teal }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="qp-mono text-sm font-semibold shrink-0" style={{ color: e.type === "priority" ? C.coral : C.amber }}>
                  {e.label}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: C.textLight }}>
                  {e.name}
                </span>
              </div>
              <span className="text-xs qp-mono shrink-0" style={{ color: C.textFaint }}>
                {elapsedLabel(now - e.completedAt)} ago
              </span>
            </div>
            <div className="text-xs mt-1 truncate" style={{ color: C.textMuted }}>
              {e.phone} · {serviceName(e.serviceId)}
            </div>
            <div className="text-[10px] mt-0.5 truncate qp-mono" style={{ color: C.textFaint }}>
              {desks.find((d) => d.id === e.deskId)?.name || deskWord} · waited {elapsedLabel(e.waitMs)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
