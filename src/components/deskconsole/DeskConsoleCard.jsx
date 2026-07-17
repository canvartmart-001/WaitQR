import { ArrowRight, Check, Coffee, Info, X } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel, elapsedTimerLabel } from "../../lib/format";
import { SnoozingCat } from "../shared/SnoozingCat";
import { selectNextTicketForDesk } from "../../hooks/useQueue";

export function DeskConsoleCard({
  desk: d,
  now,
  isExpanded,
  onToggleExpanded,
  services,
  serviceName,
  serviceWord,
  serviceWordLower,
  serviceWordPluralLower,
  deskWordLower,
  queue,
  eligibleForDesk,
  completingDesk,
  startingDesk,
  skippingDesk,
  justRevealedDesk,
  callNext,
  startService,
  completeTicket,
  skipTicket,
  toggleDeskLock,
  askConfirm,
  servedByDesk,
  absentByDesk,
  removedByDesk,
  servedByDeskService,
  absentByDeskService,
  removedByDeskService,
}) {
  const canCallNext = !d.current && queue.some(eligibleForDesk(d));
  const isCalledNotStarted = d.current && !d.current.startedAt;
  const previewTicket = !d.current ? selectNextTicketForDesk(queue, d) : null;

  const t = d.current || previewTicket;
  const label = t ? t.label : null;
  const name = t ? t.name : null;
  const phone = t ? t.phone : null;
  const svcId = t ? t.serviceId : null;
  const isPri = t?.type === "priority";
  const dim = !d.current;
  const revealAnim = justRevealedDesk === d.id ? "qp-card-in" : "";
  const isPrimaryBusy = completingDesk === d.id || startingDesk === d.id;
  const isLocked = Boolean(d.locked);
  const isServing = Boolean(d.current?.startedAt);
  const stateLabel = d.current ? (d.current.startedAt ? "Now Serving" : "Called") : previewTicket ? "Next in line" : null;
  const primaryLabel = !d.current ? "Call Next" : !d.current.startedAt ? "Start Serving" : "Mark Complete";
  const primaryIcon = d.current?.startedAt ? <Check size={15} /> : <ArrowRight size={15} />;
  const primaryBg = !d.current ? "#2663eb" : !d.current.startedAt ? "#E8A33D" : "#4FB286";
  const timerLabel = d.current?.startedAt ? elapsedTimerLabel(now - d.current.startedAt) : null;

  const handlePrimaryAction = () => {
    if (!d.current) {
      callNext(d.id);
      return;
    }

    if (!d.current.startedAt) {
      startService(d.id);
      return;
    }

    completeTicket(d.id);
  };

  const renderDeskActions = (className = "mt-4 flex items-stretch gap-2") => (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={handlePrimaryAction}
        disabled={!d.current ? !canCallNext || isPrimaryBusy : isPrimaryBusy}
        title={
          !d.current
            ? canCallNext
              ? "Call next"
              : `No waiting tickets match this ${deskWordLower}'s ${serviceWordPluralLower}`
            : !d.current.startedAt
              ? "Start serving this ticket"
              : "Mark ticket complete"
        }
        className={`qp-focusable flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${!d.current ? "border-0" : "border"}`}
        style={{
          borderColor: "transparent",
          color: C.textLight,
          background: primaryBg,
        }}
      >
        <span>{primaryLabel}</span>
        {primaryIcon}
      </button>

      {!d.current ? (
        <button
          type="button"
          onClick={() => {}}
          title="Break"
          className="qp-focusable flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-30"
          style={{
            borderColor: C.ink600,
            color: C.textLight,
            background: "rgba(38,44,54,0.92)",
          }}
        >
          <Coffee size={15} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => skipTicket(d.id)}
          disabled={skippingDesk === d.id}
          title="Mark absent / no-show"
          className="qp-focusable flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-[rgba(38,44,54,0.92)] text-[#E2614F] transition-colors hover:bg-[#E2614F] hover:text-[#F2EFE7] disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: "transparent" }}
        >
          <X size={15} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleExpanded}
        className={`qp-focusable flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[#F2EFE7] ${isExpanded ? "bg-[rgba(255,255,255,0.08)] text-[#F2EFE7]" : "bg-[rgba(38,44,54,0.92)] text-[#5B6270]"}`}
        title={isExpanded ? "Hide detail" : "Show detail"}
        style={{ borderColor: "transparent" }}
      >
        <Info size={14} />
      </button>
    </div>
  );

  const renderExpandedDetails = () => (
    <div className="qp-desk-expanded-details">
      <div className="flex flex-col gap-1">
        {(() => {
          const list = services.filter((s) => d.services.includes(s.id));
          if (list.length === 0) {
            return (
              <div className="py-1 text-xs" style={{ color: C.textFaint }}>
                No {serviceWordPluralLower} assigned yet.
              </div>
            );
          }

          return list.map((s) => {
            const key = `${d.id}|${s.id}`;
            const sv = servedByDeskService[key] || 0;
            const ab = absentByDeskService[key] || 0;
            const rm = removedByDeskService[key] || 0;
            return (
              <div key={s.id} className="flex items-center justify-between border-b py-1.5 last:border-b-0" style={{ borderColor: C.ink700 }}>
                <span className="truncate text-xs" style={{ color: C.textLight }}>
                  {s.name}
                </span>
                <span className="qp-mono flex shrink-0 items-center gap-3 text-[11px]">
                  <span style={{ color: C.teal }}>{sv}</span>
                  <span style={{ color: C.coral }}>{ab}</span>
                  <span style={{ color: C.textFaint }}>{rm}</span>
                </span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );

  return (
    <div className="qp-console-card">
      <div>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                askConfirm?.(
                  d.locked ? `Open ${deskWordLower}?` : `Close ${deskWordLower}?`,
                  d.locked
                    ? `${d.name} is currently closed for new joining. Opening it will let visitors join this ${deskWordLower} again.`
                    : `${d.name} is currently open for joining. Closing it will stop new visitors from joining this ${deskWordLower}.`,
                  () => toggleDeskLock?.(d.id),
                  {
                    confirmLabel: d.locked ? `Open ${deskWordLower}` : `Close ${deskWordLower}`,
                    variant: d.locked ? "success" : "danger",
                  }
                )
              }
              className="qp-focusable flex min-w-0 items-center gap-1 rounded-full px-1 py-0.5 text-left transition-colors hover:bg-white/5"
              title={d.locked ? "Currently closed for new joining" : "Currently open for joining"}
            >
              <span
                className={`${isServing ? "qp-livedot" : ""} h-1.5 w-1.5 shrink-0 rounded-full`}
                aria-hidden="true"
                style={{ background: isLocked ? C.coral : C.teal }}
              />
              <span className="shrink-0 text-xs font-semibold uppercase tracking-wider" style={{ color: C.textMuted }}>
                {d.name}
              </span>
              <span className="sr-only">{isLocked ? "Closed for new joining" : "Open for joining"}</span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {timerLabel && (
              <span className="qp-mono text-sm font-semibold tracking-wide" style={{ color: C.teal }}>
                {timerLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {t ? (
            <>
              <div
                className={`qp-desk-ticket-frame ${d.current?.startedAt ? "qp-serving" : ""} ${skippingDesk === d.id ? "qp-skip-out" : ""} ${revealAnim}`}
                style={{
                  background: C.ink800,
                  borderColor: isCalledNotStarted ? C.amber : d.current?.startedAt ? C.teal : C.ink700,
                }}
              >
                <div className="px-4 py-4">
                  {stateLabel ? (
                    <div className="qp-desk-ticket-status" style={{ color: d.current?.startedAt ? C.teal : C.amber }}>
                      {stateLabel}
                    </div>
                  ) : null}

                  <div className="qp-desk-ticket-layout">
                    <div className="qp-desk-ticket-left">
                      <div className="qp-desk-ticket-stack">
                        {label ? (
                          <span
                            className="qp-desk-ticket-number qp-ticket-face block font-bold"
                            style={{ color: isPri ? C.coral : C.amber, opacity: dim ? 0.95 : 1 }}
                          >
                            {label}
                          </span>
                        ) : null}
                        {renderDeskActions("qp-desk-ticket-actions qp-desk-ticket-actions-desktop")}
                      </div>
                    </div>

                    <div className="qp-desk-ticket-info min-w-0 py-1">
                      <div className="qp-desk-info-column">
                        <div className="min-w-0">
                          <div className="qp-desk-info-label uppercase" style={{ color: C.textFaint }}>
                            Name
                          </div>
                          <div className="qp-desk-info-value truncate font-semibold leading-tight" style={{ color: dim ? C.textMuted : C.textLight }}>
                            {name || "—"}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="qp-desk-info-label uppercase" style={{ color: C.textFaint }}>
                            Phone
                          </div>
                          <div className="qp-desk-info-value qp-mono truncate font-medium" style={{ color: dim ? C.textMuted : C.textLight }}>
                            {phone || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="qp-desk-info-column">
                        <div className="min-w-0">
                          <div className="qp-desk-info-label uppercase" style={{ color: C.textFaint }}>
                            Joined
                          </div>
                          <div className="qp-desk-info-value qp-mono truncate" style={{ color: C.textMuted }}>
                            {t?.createdAt ? `${elapsedLabel(now - t.createdAt)} ago` : "—"}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="qp-desk-info-label uppercase" style={{ color: C.textFaint }}>
                            {serviceWord}
                          </div>
                          <div className="qp-desk-info-value truncate font-semibold leading-tight" style={{ color: dim ? C.textMuted : C.textLight }}>
                            {svcId ? serviceName(svcId) : "—"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {renderDeskActions("qp-desk-ticket-actions qp-desk-ticket-actions-mobile")}
                  </div>
                </div>

                {isExpanded ? renderExpandedDetails() : null}
              </div>
            </>
          ) : (
            <div className="qp-desk-ticket-frame" style={{ background: C.ink800, borderColor: C.ink700 }}>
              <div className="flex w-full flex-col items-center gap-0.5 px-4 py-4">
                <SnoozingCat />
                <span className="text-[10px] tracking-wide" style={{ color: C.textFaint }}>
                  No one in queue
                </span>
              </div>
              {isExpanded ? renderExpandedDetails() : null}
            </div>
          )}
        </div>

        {!t ? renderDeskActions() : null}
      </div>
    </div>
  );
}
