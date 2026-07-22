import { ArrowRight, CalendarDays, Check, Clock3, Coffee, Layers3, Lock, MoreHorizontal, Phone, Ticket, Unlock, UserRound, Volume2, X } from "lucide-react";
import { useState } from "react";
import { C } from "../../lib/theme";
import { elapsedLabel, elapsedTimerLabel } from "../../lib/format";
import { SnoozingCat } from "../shared/SnoozingCat";
import { selectNextTicketForDesk } from "../../hooks/useQueue";

const DEFAULT_SCHEDULE = { entries: [{ days: [1], startTime: "09:00", endTime: "17:00" }] };
const WEEK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

function normalizeSchedule(schedule) {
  const source = schedule && typeof schedule === "object" ? schedule : {};
  const sourceEntries = Array.isArray(source.entries) && source.entries.length
    ? source.entries
    : Array.isArray(source.days)
      ? [{ days: source.days, startTime: source.startTime, endTime: source.endTime }]
      : DEFAULT_SCHEDULE.entries;

  const entries = sourceEntries
    .map((entry) => ({
      days: (Array.isArray(entry?.days) ? entry.days : [entry?.day]).map(Number).filter((day) => day >= 0 && day <= 6),
      startTime: entry?.startTime || "09:00",
      endTime: entry?.endTime || "17:00",
    }))
    .filter((entry) => entry.days.length > 0);

  return { entries: entries.length ? entries : DEFAULT_SCHEDULE.entries };
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function formatScheduleTime(time) {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return "";
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatScheduleRange(entry) {
  return `${formatScheduleTime(entry.startTime)} - ${formatScheduleTime(entry.endTime)}`;
}

function formatJoinedDateTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function scheduleDayRows(schedule) {
  const normalized = normalizeSchedule(schedule);
  return WEEK_DAYS.map((day) => {
    const entries = normalized.entries.filter((entry) => entry.days.includes(day.value));
    return {
      ...day,
      time: entries.length ? entries.map(formatScheduleRange).join(", ") : "Closed",
      open: entries.length > 0,
    };
  });
}

function isScheduleOpenNow(schedule, now = new Date()) {
  const normalized = normalizeSchedule(schedule);
  const currentDay = now.getDay();
  const previousDay = (currentDay + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return normalized.entries.some((entry) => {
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    if (start == null || end == null) return false;

    if (start <= end) {
      return entry.days.includes(currentDay) && currentMinutes >= start && currentMinutes < end;
    }

    return (entry.days.includes(currentDay) && currentMinutes >= start) || (entry.days.includes(previousDay) && currentMinutes < end);
  });
}

function deskAvailability(desk, now) {
  const mode = desk.status === "Scheduled"
    ? "scheduled"
    : desk.status === "Unavailable"
      ? "always_closed"
      : desk.status === "Available"
        ? "always_open"
        : desk.availabilityMode || "always_open";
  if (mode === "scheduled" || desk.status === "Scheduled") {
    const open = isScheduleOpenNow(desk.schedule, new Date(now));
    return {
      mode: "scheduled",
      open,
      dot: open ? C.teal : C.amber,
      label: open ? "Scheduled open" : "Scheduled closed",
    };
  }

  const open = mode !== "always_closed" && desk.status !== "Unavailable" && !desk.locked;
  return {
    mode,
    open,
    dot: open ? C.teal : C.coral,
    label: open ? "Open" : "Closed",
  };
}

export function DeskConsoleCard({
  desk: d,
  now,
  isExpanded,
  onToggleExpanded,
  services,
  serviceName,
  theme,
  serviceWord,
  serviceWordLower,
  serviceWordPluralLower,
  deskWordLower,
  queue,
  eligibleForDesk,
  completingDesk,
  completingTicket,
  startingDesk,
  startingTicket,
  skippingDesk,
  skippingTicket,
  callNext,
  startService,
  completeTicket,
  skipTicket,
  updateDesk,
  servedByDesk,
  absentByDesk,
  removedByDesk,
  servedByDeskService,
  absentByDeskService,
  removedByDeskService,
  readOnlyQueued = false,
  actionDeskId = d.id,
  actionTicketId = null,
}) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [draftStatusMode, setDraftStatusMode] = useState("always_open");
  // Break state belongs to the shared desk record so every counter and the
  // public live board receive it through the real-time desk-status update.
  const isOnBreak = Boolean(d.onBreak);
  const canCallNext = !d.current && queue.some(eligibleForDesk(d));
  const previewTicket = !d.current ? selectNextTicketForDesk(queue, d) : null;

  const t = d.current || previewTicket;
  const label = t ? t.label : null;
  const name = t ? t.name : null;
  const phone = t ? t.phone : null;
  const svcId = t ? t.serviceId : null;
  const isPri = t?.type === "priority";
  const activeTicketId = actionTicketId || d.current?.id || null;
  const isCompletingThisTicket = completingTicket != null
    ? String(completingTicket) === String(activeTicketId)
    : completingDesk === d.id;
  const isStartingThisTicket = startingTicket != null
    ? String(startingTicket) === String(activeTicketId)
    : startingDesk === d.id;
  const isSkippingThisTicket = skippingTicket != null
    ? String(skippingTicket) === String(activeTicketId)
    : skippingDesk === d.id;
  const isPrimaryBusy = isCompletingThisTicket || isStartingThisTicket;
  const actionsDisabled = readOnlyQueued;
  const availability = deskAvailability(d, now);
  const isServing = Boolean(d.current?.startedAt);
  const servingPanelLabel = d.current ? (d.current.startedAt ? "Now Serving" : "Called") : "Next Up";
  const servingPanelTone = d.current ? (d.current.startedAt ? "now-serving" : "called") : "next-up";
  const primaryLabel = !d.current ? "Call Next" : !d.current.startedAt ? "Start Serving" : "Mark Complete";
  const primaryIcon = d.current?.startedAt ? <Check size={15} /> : <ArrowRight size={15} />;
  const timerLabel = d.current?.startedAt ? elapsedTimerLabel(now - d.current.startedAt) : null;
  const scheduleRows = scheduleDayRows(d.schedule);
  const currentScheduleDay = new Date(now).getDay();
  const currentScheduleColor = isScheduleOpenNow(d.schedule, new Date(now)) ? C.teal : C.amber;
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const subtleBackground = withAlpha(surfaceTheme.fontColor, "08");
  const controlBackground = withAlpha(surfaceTheme.fontColor, "12");
  const primaryBg = isOnBreak && !d.current
    ? "#8B919C"
    : !d.current
      ? surfaceTheme.accentColor
      : !d.current.startedAt
        ? C.amber
        : C.teal;

  const handlePrimaryAction = () => {
    if (actionsDisabled) return;

    if (!d.current) {
      callNext(actionDeskId);
      return;
    }

    if (!d.current.startedAt) {
      startService(actionDeskId, actionTicketId);
      return;
    }

    completeTicket(actionDeskId, actionTicketId);
  };

  const updateDeskAvailability = (mode) => {
    const currentSchedule = normalizeSchedule(d.schedule);
    const next = mode === "scheduled"
      ? {
          availabilityMode: "scheduled",
          status: "Scheduled",
          schedule: currentSchedule,
          locked: !isScheduleOpenNow(currentSchedule, new Date(now)),
        }
      : mode === "always_closed"
        ? {
            availabilityMode: "always_closed",
            status: "Unavailable",
            schedule: d.schedule ? currentSchedule : null,
            locked: true,
          }
        : {
            availabilityMode: "always_open",
            status: "Available",
            schedule: d.schedule ? currentSchedule : null,
            locked: false,
          };

    updateDesk?.(d.id, next);
    setStatusOpen(false);
  };

  const openStatusDialog = () => {
    setDraftStatusMode(availability.mode);
    setStatusOpen(true);
  };

  const statusIcon = availability.mode === "scheduled"
    ? <CalendarDays size={14} />
    : availability.open
      ? <Unlock size={14} />
      : <Lock size={14} />;

  const renderDeskActions = (className = "qp-desk-ticket-actions") => (
    <div className={`${className} ${isOnBreak && !d.current ? "qp-desk-ticket-actions--break" : ""}`} onClick={(e) => e.stopPropagation()}>
      <button
          type="button"
          onClick={handlePrimaryAction}
          disabled={actionsDisabled || (!d.current ? !canCallNext || isPrimaryBusy || isOnBreak : isPrimaryBusy)}
          title={
            actionsDisabled
              ? "Finish the current ticket before starting this called ticket"
              : !d.current
              ? canCallNext
                ? "Call next"
                : `No waiting tickets match this ${deskWordLower}'s ${serviceWordPluralLower}`
              : !d.current.startedAt
                ? "Start serving this ticket"
                : "Mark ticket complete"
          }
          aria-hidden={isOnBreak && !d.current}
          tabIndex={isOnBreak && !d.current ? -1 : undefined}
          className={`qp-focusable qp-desk-primary-action disabled:cursor-not-allowed disabled:opacity-30 ${isOnBreak && !d.current ? "qp-desk-primary-action--break-hidden" : ""}`}
          style={{
            borderColor: "transparent",
            color: C.textLight,
            backgroundColor: primaryBg,
            borderRadius: surfaceTheme.radius,
          }}
        >
          {!d.current ? <Volume2 size={16} /> : null}
          <span>{primaryLabel}</span>
          <span className="qp-desk-primary-arrow">{primaryIcon}</span>
      </button>

      {!d.current ? (
        <button
          type="button"
          onClick={() => updateDesk?.(d.id, { onBreak: !isOnBreak })}
          aria-pressed={isOnBreak}
          title={isOnBreak ? "End break" : "Take a break"}
          className={`qp-focusable qp-desk-secondary-action qp-desk-break-action disabled:opacity-30 ${isOnBreak ? "qp-desk-break-action--active" : ""}`}
          style={{
            borderColor: surfaceTheme.borderColor,
            color: mutedColor,
            background: controlBackground,
            borderRadius: surfaceTheme.radius,
          }}
        >
          <Coffee size={15} />
          <span>On Break</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => skipTicket(actionDeskId, actionTicketId)}
          disabled={actionsDisabled || isSkippingThisTicket}
          title={actionsDisabled ? "Finish the current ticket before marking this called ticket absent" : "Mark absent / no-show"}
          className="qp-focusable qp-desk-secondary-action hover:bg-[#E2614F] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          style={{ borderColor: "transparent", background: controlBackground, color: C.coral, borderRadius: surfaceTheme.radius }}
        >
          <X size={15} />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleExpanded}
        disabled={readOnlyQueued}
        className={`qp-focusable qp-desk-secondary-action qp-desk-more-action ${isExpanded ? "qp-desk-more-action--expanded" : ""}`}
        title={readOnlyQueued ? "Details are available when this ticket becomes active" : isExpanded ? "Hide detail" : "Show detail"}
        style={{
          borderColor: "transparent",
          background: isExpanded ? withAlpha(surfaceTheme.accentColor, "1f") : controlBackground,
          color: isExpanded ? surfaceTheme.accentColor : mutedColor,
          borderRadius: surfaceTheme.radius,
        }}
      >
        <MoreHorizontal size={17} />
      </button>
    </div>
  );

  const renderExpandedDetails = () => (
    <div className="qp-desk-expanded-details" style={{ borderColor: surfaceTheme.borderColor }}>
      <div className="qp-desk-expanded-content">
        <div className="qp-desk-service-header" style={{ color: faintColor }}>
          <span>Service</span>
          <span className="qp-desk-service-count-labels">
            <span>Served</span>
            <span>Absent</span>
            <span>Removed</span>
          </span>
        </div>
        {(() => {
          const list = services.filter((s) => d.services.includes(s.id));
          if (list.length === 0) {
            return (
              <div className="py-1 text-xs" style={{ color: faintColor }}>
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
              <div key={s.id} className="qp-desk-service-row" style={{ borderColor: withAlpha(surfaceTheme.borderColor, "66") }}>
                <span className="qp-desk-service-name truncate" style={{ color: surfaceTheme.fontColor }}>
                  {s.name}
                </span>
                <span className="qp-desk-service-counts">
                  <span className="qp-mono text-center" style={{ color: C.teal }}>{sv}</span>
                  <span className="qp-mono text-center" style={{ color: C.coral }}>{ab}</span>
                  <span className="qp-mono text-center" style={{ color: faintColor }}>{rm}</span>
                </span>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );

  const renderDeskStatusButton = (onAccent = false) => (
    <button
      type="button"
      onClick={readOnlyQueued ? undefined : openStatusDialog}
      disabled={readOnlyQueued}
      className={`qp-focusable flex min-w-0 items-center gap-1.5 rounded-full py-0.5 text-left transition-colors ${readOnlyQueued ? "cursor-default" : "hover:bg-white/5"}`}
      title={availability.label}
    >
      <span
        className="qp-desk-status-icon inline-flex shrink-0 items-center justify-center"
        aria-hidden="true"
        style={{ color: onAccent ? "var(--qp-serving-panel-muted)" : availability.dot }}
      >
        {statusIcon}
      </span>
      <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider" style={{ color: onAccent ? "var(--qp-serving-panel-muted)" : mutedColor }}>
        {d.name}
      </span>
      <span className="sr-only">{availability.label}</span>
    </button>
  );

  return (
    <div className="qp-console-card">
      <div>
        <div className="flex flex-col gap-4">
          {t ? (
            <div
              className={`qp-desk-ticket-frame ${d.current?.startedAt ? "qp-serving" : ""}`}
              style={{
                "--qp-desk-accent": surfaceTheme.accentColor,
                "--qp-desk-status-accent": primaryBg,
                "--qp-desk-radius": `${surfaceTheme.radius * 1.2}px`,
                borderColor: surfaceTheme.borderColor,
              }}
            >
              <div className="qp-desk-ticket-main">
                <section className={`qp-desk-serving-panel qp-desk-serving-panel--${servingPanelTone} ${isOnBreak && !d.current ? "qp-desk-serving-panel--break" : ""}`}>
                  <div className="qp-desk-serving-header" onClick={(e) => e.stopPropagation()}>
                    {renderDeskStatusButton(true)}
                  </div>

                  <div className="qp-desk-serving-caption">
                    <span className="qp-desk-caption-icon"><Ticket size={15} /></span>
                    <span>{servingPanelLabel}</span>
                  </div>

                  <div className={`qp-desk-ticket-number qp-ticket-face ${isPri ? "qp-priority-ticket" : ""}`}>{label}</div>
                  <div className="qp-desk-serving-name truncate">{name || "—"}</div>
                  <div className="qp-desk-service-pill truncate">{svcId ? serviceName(svcId) : "—"}</div>

                  <div className="qp-desk-serving-time">
                    <Clock3 size={14} />
                    <span>{t?.createdAt ? `Joined ${elapsedLabel(now - t.createdAt)} ago` : "Join time unavailable"}</span>
                  </div>
                </section>

                <section className="qp-desk-details-panel">
                  <div className="qp-desk-details-heading">
                    <span>Queue Details</span>
                    {timerLabel ? <span className="qp-mono qp-desk-timer">{timerLabel}</span> : null}
                  </div>

                  <div className="qp-desk-details-list">
                    <div className="qp-desk-detail-row">
                      <UserRound size={16} />
                      <span className="qp-desk-detail-label">Name</span>
                      <span className="qp-desk-detail-value truncate">{name || "—"}</span>
                    </div>
                    <div className="qp-desk-detail-row">
                      <Clock3 size={16} />
                      <span className="qp-desk-detail-label">Joined</span>
                      <span className="qp-desk-detail-value qp-mono truncate" title={t?.createdAt ? formatJoinedDateTime(t.createdAt) : undefined}>
                        {t?.createdAt ? formatJoinedDateTime(t.createdAt) : "—"}
                      </span>
                    </div>
                    <div className="qp-desk-detail-row">
                      <Phone size={16} />
                      <span className="qp-desk-detail-label">Phone</span>
                      <span className="qp-desk-detail-value qp-mono truncate">{phone || "—"}</span>
                      {phone ? <a className="qp-desk-phone-action" href={`tel:${phone}`} aria-label={`Call ${phone}`}><Phone size={14} /></a> : null}
                    </div>
                    <div className="qp-desk-detail-row">
                      <Layers3 size={16} />
                      <span className="qp-desk-detail-label">{serviceWord}</span>
                      <span className="qp-desk-detail-value truncate">{svcId ? serviceName(svcId) : "—"}</span>
                    </div>
                  </div>

                  {renderDeskActions()}
                </section>
              </div>

              <div className={`qp-desk-details-reveal ${isExpanded ? "qp-desk-details-reveal--open" : ""}`} aria-hidden={!isExpanded}>
                {renderExpandedDetails()}
              </div>
            </div>
          ) : (
            <div
              className="qp-desk-ticket-frame"
              style={{
                background: subtleBackground,
                borderColor: surfaceTheme.borderColor,
                borderRadius: surfaceTheme.radius * 1.2,
              }}
            >
              <div className="flex w-full flex-col items-center gap-0.5 px-4 py-4">
                <SnoozingCat />
                <span className="text-[10px] tracking-wide" style={{ color: faintColor }}>
                  No one in queue
                </span>
              </div>
              <div className={`qp-desk-details-reveal ${isExpanded ? "qp-desk-details-reveal--open" : ""}`} aria-hidden={!isExpanded}>
                {renderExpandedDetails()}
              </div>
            </div>
          )}
        </div>

        {!t ? renderDeskActions() : null}
      </div>

      {statusOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setStatusOpen(false)}>
          <div
            className="qp-modal w-full max-w-sm p-5"
            style={{ background: surfaceTheme.bgColor, borderRadius: surfaceTheme.radius * 1.4, boxShadow: "0 22px 60px rgba(0,0,0,0.45)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: mutedColor }}>
                Counter status
              </div>
              <h3 className="mt-1 text-lg font-semibold" style={{ color: surfaceTheme.fontColor }}>
                {d.name}
              </h3>
              <div className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ color: availability.dot, background: `${availability.dot}24` }}>
                {availability.label}
              </div>
            </div>

            <div className="grid gap-2">
              <button
                type="button"
                onClick={() => setDraftStatusMode("always_open")}
                className="qp-focusable flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ borderColor: surfaceTheme.borderColor, color: surfaceTheme.fontColor, borderRadius: surfaceTheme.radius }}
              >
                <span className="inline-flex items-center gap-2">
                  <Unlock size={15} style={{ color: C.teal }} />
                  Open
                </span>
                {draftStatusMode === "always_open" ? <Check size={15} style={{ color: C.teal }} /> : null}
              </button>
              <button
                type="button"
                onClick={() => setDraftStatusMode("always_closed")}
                className="qp-focusable flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ borderColor: surfaceTheme.borderColor, color: surfaceTheme.fontColor, borderRadius: surfaceTheme.radius }}
              >
                <span className="inline-flex items-center gap-2">
                  <Lock size={15} style={{ color: C.coral }} />
                  Closed
                </span>
                {draftStatusMode === "always_closed" ? <Check size={15} style={{ color: C.coral }} /> : null}
              </button>
              <button
                type="button"
                onClick={() => setDraftStatusMode("scheduled")}
                className="qp-focusable w-full rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-white/5"
                style={{ borderColor: surfaceTheme.borderColor, color: surfaceTheme.fontColor, borderRadius: surfaceTheme.radius }}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={15} style={{ color: C.amber }} />
                    Scheduled
                  </span>
                  {draftStatusMode === "scheduled" ? <Check size={15} style={{ color: C.amber }} /> : null}
                </span>
                <span
                  className="block overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: draftStatusMode === "scheduled" ? 190 : 0,
                    opacity: draftStatusMode === "scheduled" ? 1 : 0,
                    marginTop: draftStatusMode === "scheduled" ? 10 : 0,
                  }}
                >
                  <span className="grid gap-1.5">
                    {scheduleRows.map((row) => {
                      const isCurrentDay = row.value === currentScheduleDay;
                      const rowColor = isCurrentDay ? currentScheduleColor : faintColor;

                      return (
                        <span key={row.value} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 text-xs">
                          <span className="font-semibold" style={{ color: rowColor }}>
                            {row.label}
                          </span>
                          <span className="qp-mono truncate" style={{ color: rowColor }}>
                            {row.time}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusOpen(false)}
                className="qp-focusable rounded-md px-3 py-2 text-xs"
                style={{ background: controlBackground, color: mutedColor, borderRadius: surfaceTheme.radius }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateDeskAvailability(draftStatusMode)}
                className="qp-focusable rounded-md px-3 py-2 text-xs font-medium"
                style={{ background: surfaceTheme.accentColor, color: C.textLight, borderRadius: surfaceTheme.radius }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
