import { useState } from "react";
import { ChevronDown, ChevronRight, Tag } from "lucide-react";
import { C } from "../../lib/theme";

export function ServiceBreakdownSection({
  embedded = false,
  services,
  desks,
  serviceWord,
  serviceWordLower,
  serviceWordPluralLower,
  deskWordLower,
  servedByService,
  absentByService,
  removedByService,
  waitingByService,
  servedByDeskService,
  absentByDeskService,
}) {
  const [expandedService, setExpandedService] = useState(null);
  const content = (
    <>
      {services.length === 0 ? (
        <div className="text-sm py-4 text-center" style={{ color: C.textFaint }}>
          No {serviceWordPluralLower} defined.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {services.map((s) => {
            const served = servedByService[s.id] || 0;
            const absent = absentByService[s.id] || 0;
            const removed = removedByService[s.id] || 0;
            const waiting = waitingByService[s.id] || 0;
            const isOpen = expandedService === s.id;
            const deskRows = desks
              .map((d) => ({
                name: d.name,
                served: servedByDeskService[`${d.id}|${s.id}`] || 0,
                absent: absentByDeskService[`${d.id}|${s.id}`] || 0,
              }))
              .filter((r) => r.served > 0 || r.absent > 0);
            return (
              <div key={s.id} className="rounded-lg border" style={{ borderColor: C.ink700 }}>
                <button type="button" onClick={() => setExpandedService(isOpen ? null : s.id)} className="qp-focusable w-full flex flex-col gap-1.5 px-3 py-2.5 text-left">
                  <span className="text-sm font-medium flex items-center gap-1.5 min-w-0 truncate" style={{ color: C.textLight }}>
                    {s.name}
                    {isOpen ? <ChevronDown size={14} style={{ color: C.textFaint }} /> : <ChevronRight size={14} style={{ color: C.textFaint }} />}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs qp-mono" style={{ color: C.textFaint }}>
                    <span style={{ color: C.teal }}>{served} served</span>
                    <span style={{ color: C.coral }}>{absent} absent</span>
                    <span style={{ color: C.textMuted }}>{removed} removed</span>
                    <span>{waiting} waiting</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 pt-1 border-t flex flex-col gap-1" style={{ borderColor: C.ink700 }}>
                    {deskRows.length === 0 && removed === 0 ? (
                      <div className="text-xs py-1" style={{ color: C.textFaint }}>
                        No {deskWordLower} activity yet for this {serviceWordLower}.
                      </div>
                    ) : (
                      <>
                        {deskRows.map((r) => (
                          <div key={r.name} className="flex items-center justify-between text-xs py-1">
                            <span style={{ color: C.textMuted }}>{r.name}</span>
                            <span className="qp-mono flex items-center gap-3">
                              <span style={{ color: C.teal }}>{r.served} served</span>
                              <span style={{ color: C.coral }}>{r.absent} absent</span>
                            </span>
                          </div>
                        ))}
                        {removed > 0 && (
                          <div className="flex items-center justify-between text-xs py-1 mt-1 pt-2 border-t" style={{ borderColor: C.ink700 }}>
                            <span style={{ color: C.textMuted }}>Removed (deleted, not returned)</span>
                            <span className="qp-mono" style={{ color: C.textFaint }}>
                              {removed}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="qp-panel-card mt-3" style={{ background: C.ink800, borderColor: C.hair }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textMuted }}>
          <Tag size={13} />
          {serviceWord} breakdown
        </div>
      </div>

      {content}
    </div>
  );
}
