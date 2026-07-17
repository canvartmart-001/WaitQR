import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";

export function WaitingTab({ filteredWaiting, now, serviceName, desks, deskWord }) {
  if (filteredWaiting.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: C.textFaint }}>
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
            borderColor: C.ink700,
            background: t._isCalled ? "rgba(255,255,255,0.02)" : "rgba(18,21,27,0.38)",
          }}
        >
          <div
            className="qp-ticket-face flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-xl font-semibold leading-none"
            style={{
              fontFamily: "'Roboto', sans-serif",
              color: C.textLight,
              borderColor: C.ink700,
              background: "rgba(255,255,255,0.02)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <span className="qp-ticket-face text-sm font-semibold shrink-0" style={{ color: C.textLight, fontVariantNumeric: "tabular-nums" }}>
                  {t.label}
                </span>
                <span className="text-sm font-medium truncate" style={{ color: C.textLight }}>
                  {t.name}
                </span>
                {t.type === "priority" && (
                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(38,44,54,0.92)", color: C.coral }}>
                    Priority
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {t._isCalled && (
                  <span
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wider shrink-0"
                    style={{ background: "rgba(38,44,54,0.92)" }}
                  >
                    <span style={{ color: C.amber }}>Called</span>
                    <span className="ml-1" style={{ color: C.textLight }}>
                      {desks.find((d) => d.id === t._calledFromDeskId)?.name || deskWord}
                    </span>
                  </span>
                )}
                <span className="qp-ticket-face text-xs shrink-0" style={{ color: C.textFaint, fontVariantNumeric: "tabular-nums" }}>
                  {elapsedLabel(now - t.createdAt)}
                </span>
              </div>
            </div>
            <div className="text-xs mt-1 truncate" style={{ color: C.textMuted }}>
              {t.phone} · {serviceName(t.serviceId)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
