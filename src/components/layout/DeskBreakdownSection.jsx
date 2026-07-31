import { useEffect, useRef, useState } from "react";
import { CalendarDays, ExternalLink, LayoutGrid, Lock, Unlock } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";
import { orderTicketsForDesk } from "../../hooks/useQueue";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

function ticketStyle(status, palette) {
  const accent = status === "called"
    ? C.amber
    : status === "serving" || status === "served"
      ? C.teal
      : status === "absent" || status === "removed"
        ? C.coral
        : palette.accentColor;
  return {
    borderColor: withAlpha(accent, "66"),
    background: `linear-gradient(135deg, ${withAlpha(accent, "14")}, transparent 48%), var(--surface-bg, transparent)`,
    accent,
    text: palette.fontColor,
  };
}

const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

function normalizeSchedule(schedule) {
  const source = schedule && typeof schedule === "object" ? schedule : {};
  const sourceEntries = Array.isArray(source.entries) && source.entries.length
    ? source.entries
    : Array.isArray(source.days)
      ? [{ days: source.days, startTime: source.startTime, endTime: source.endTime }]
      : [{ days: [1], startTime: source.startTime, endTime: source.endTime }];

  return {
    entries: sourceEntries
      .map((entry) => ({
        days: (Array.isArray(entry?.days) ? entry.days : [entry?.day]).map(Number).filter((day) => WEEK_DAYS.includes(day)),
        startTime: entry?.startTime || "09:00",
        endTime: entry?.endTime || "17:00",
      }))
      .filter((entry) => entry.days.length),
  };
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
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
    if (start <= end) return entry.days.includes(currentDay) && currentMinutes >= start && currentMinutes < end;
    return (entry.days.includes(currentDay) && currentMinutes >= start) || (entry.days.includes(previousDay) && currentMinutes < end);
  });
}

function deskStatusState(desk, now) {
  const mode = desk?.status === "Scheduled"
    ? "scheduled"
    : desk?.status === "Unavailable"
      ? "always_closed"
      : desk?.status === "Available"
        ? "always_open"
        : desk?.availabilityMode || "always_open";
  const scheduled = mode === "scheduled" || desk?.status === "Scheduled";
  const open = scheduled ? isScheduleOpenNow(desk?.schedule, new Date(now)) : mode !== "always_closed" && desk?.status !== "Unavailable" && !desk?.locked;

  if (scheduled) return { Icon: CalendarDays, color: open ? C.teal : C.amber, label: open ? "Scheduled open" : "Scheduled closed" };
  return open ? { Icon: Unlock, color: C.teal, label: "Open" } : { Icon: Lock, color: C.coral, label: "Closed" };
}

function memberInitials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";
}

function MemberAvatar({ member, palette, size = "h-7 w-7" }) {
  const hasPhoto = Boolean(member.photo);
  const fillColor = palette.accentColor || C.blue;
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border text-[10px] font-semibold shadow-sm`}
      style={{
        borderColor: "#ffffff",
        background: hasPhoto ? "#ffffff" : fillColor,
        color: hasPhoto ? withAlpha(palette.fontColor, "80") : "#ffffff",
      }}
    >
      {member.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : memberInitials(member.name)}
    </span>
  );
}

function normalizeDeskTickets({ desk, sortedQueue, sortedServed, absentList, removedLog }) {
  const currentTicket = desk.current || null;
  const currentTicketIsServing = Boolean(currentTicket?.startedAt);
  const waitingStartOffset = currentTicket && !currentTicketIsServing ? 1 : 0;
  const currentCards = currentTicket
    ? [{
        ...currentTicket,
        _deskCardKey: `current-${desk.id}-${currentTicket.id}`,
        _deskStatus: currentTicketIsServing ? "serving" : "called",
        _deskPosition: currentTicketIsServing ? 0 : 1,
        _deskTime: currentTicket.startedAt || currentTicket.calledAt || currentTicket.createdAt,
        _deskGroup: "waiting",
      }]
    : [];

  const waitingCards = orderTicketsForDesk(sortedQueue, desk)
    .map((ticket, index) => ({
      ...ticket,
      _deskCardKey: `waiting-${desk.id}-${ticket.id}`,
      _deskStatus: "waiting",
      _deskPosition: waitingStartOffset + index + 1,
      _deskTime: ticket.createdAt,
      _deskGroup: "waiting",
    }));

  const servedCards = sortedServed
    .filter((ticket) => ticket.deskId != null && String(ticket.deskId) === String(desk.id))
    .map((ticket, index) => ({
      ...ticket,
      _deskCardKey: `served-${desk.id}-${ticket.id || ticket.label}-${ticket.completedAt || index}`,
      _deskStatus: "served",
      _deskPosition: index + 1,
      _deskTime: ticket.completedAt,
      _deskGroup: "served",
    }));

  const absentCards = absentList
    .filter((ticket) => ticket.skippedFromDesk != null && String(ticket.skippedFromDesk) === String(desk.id))
    .map((ticket, index) => ({
      ...ticket,
      _deskCardKey: `absent-${desk.id}-${ticket.id || ticket.label}-${ticket.skippedAt || index}`,
      _deskStatus: "absent",
      _deskPosition: index + 1,
      _deskTime: ticket.skippedAt,
      _deskGroup: "absent",
    }));

  const removedCards = removedLog
    .filter((ticket) => ticket.deskId != null && String(ticket.deskId) === String(desk.id))
    .map((ticket, index) => ({
      ...ticket,
      _deskCardKey: `removed-${desk.id}-${ticket.id || ticket.label}-${ticket.removedAt || index}`,
      _deskStatus: "removed",
      _deskPosition: index + 1,
      _deskTime: ticket.removedAt,
      _deskGroup: "removed",
    }));

  return [...currentCards, ...waitingCards, ...servedCards, ...absentCards, ...removedCards];
}

function DeskFilterButton({ active, color, count, label, onClick, palette }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="qp-focusable flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-center text-[13px] leading-none"
      style={{ color: active ? color : withAlpha(palette.fontColor, "66"), background: active ? withAlpha(palette.fontColor, "0a") : "transparent" }}
    >
      <span>{count}</span>
      <span>{label}</span>
    </button>
  );
}

function DeskTicketRail({ tickets, activeFilter, expandedTicket, setExpandedTicket, serviceName, now, theme }) {
  const palette = theme || {
    accentColor: C.blue,
    bgColor: C.ink800,
    fontColor: C.textLight,
    borderColor: C.hair,
    radius: 8,
  };
  const visibleTickets = tickets.filter((ticket) => ticket._deskGroup === activeFilter);
  const railRef = useRef(null);
  const [showMobileScrollbar, setShowMobileScrollbar] = useState(false);
  const activeTicket = visibleTickets.find((ticket) => expandedTicket === ticket._deskCardKey) || null;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    let timeoutId = null;
    const revealScrollbar = () => {
      setShowMobileScrollbar(true);
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => setShowMobileScrollbar(false), 900);
    };

    const handleScroll = () => revealScrollbar();
    const handleStart = () => revealScrollbar();

    rail.addEventListener("scroll", handleScroll, { passive: true });
    rail.addEventListener("touchstart", handleStart, { passive: true });
    rail.addEventListener("pointerdown", handleStart, { passive: true });

    return () => {
      rail.removeEventListener("scroll", handleScroll);
      rail.removeEventListener("touchstart", handleStart);
      rail.removeEventListener("pointerdown", handleStart);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [activeFilter]);

  useEffect(() => {
    if (!activeTicket) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setExpandedTicket(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTicket, setExpandedTicket]);

  if (visibleTickets.length === 0) {
    return (
      <div className="flex min-h-[62px] flex-1 items-center px-1 py-2.5 text-xs" style={{ color: withAlpha(palette.fontColor, "66") }}>
        No {activeFilter} tickets for this desk.
      </div>
    );
  }

  return (
    <div className="flex min-h-[108px] min-w-0 self-stretch" onClick={(event) => event.stopPropagation()}>
      <div
        ref={railRef}
        className={`qp-scroll qp-scroll-compact flex min-h-[108px] min-w-0 flex-1 items-stretch gap-2 overflow-x-scroll ${showMobileScrollbar ? "qp-scroll-mobile-visible" : "qp-scroll-mobile-hidden"}`}
      >
        {visibleTickets.map((ticket) => {
          const styles = ticketStyle(ticket._deskStatus, palette);
          const isActive = expandedTicket === ticket._deskCardKey;
          const isPrimaryHighlight = ticket._deskPosition === 1 || ticket._deskStatus === "called" || ticket._deskStatus === "serving";
          const digitCount = String(ticket._deskPosition).length;
          const positionColumnWidth = digitCount >= 3 ? 3.5 : digitCount === 2 ? 2.8 : 1.8;
          const cardMinWidth = digitCount >= 3 ? 156 : digitCount === 2 ? 144 : 124;
          return (
            <button
              key={ticket._deskCardKey}
              type="button"
              aria-expanded={isActive}
              onClick={() => setExpandedTicket(isActive ? null : ticket._deskCardKey)}
              className="qp-focusable grid min-h-[108px] shrink-0 self-stretch items-center gap-x-2.5 gap-y-1 rounded-md border px-3 py-3 text-left"
              style={{
                width: "fit-content",
                minWidth: `${cardMinWidth}px`,
                gridTemplateColumns: `${positionColumnWidth}ch minmax(0, 1fr)`,
                borderColor: isActive ? styles.accent : styles.borderColor,
                background: isActive ? withAlpha(palette.fontColor, "10") : styles.background,
                color: styles.text,
                boxShadow: isActive ? `0 0 0 1px ${styles.accent} inset` : "none",
              }}
            >
              <span className="qp-ticket-face text-[2.25rem] font-semibold leading-none justify-self-center" style={{ color: isPrimaryHighlight ? palette.fontColor : withAlpha(palette.fontColor, "70"), fontVariantNumeric: "tabular-nums" }}>
                {ticket._deskPosition}
              </span>
              <span className="min-w-0 self-center text-left">
                <span
                  className="qp-ticket-face block truncate font-semibold leading-tight"
                  style={{
                    color: isPrimaryHighlight ? palette.fontColor : withAlpha(palette.fontColor, "70"),
                    fontVariantNumeric: "tabular-nums",
                    fontSize: digitCount >= 2 ? "1.15rem" : "1.2rem",
                  }}
                >
                  {ticket.label}
                </span>
                <span
                  className="block truncate uppercase tracking-wider"
                  style={{
                    color: styles.accent,
                    fontSize: "11px",
                  }}
                >
                  {ticket._deskStatus}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {activeTicket && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setExpandedTicket(null)}
        >
          <div
            className="qp-modal w-full max-w-sm rounded-xl border p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            style={{ borderColor: ticketStyle(activeTicket._deskStatus, palette).accent, background: "var(--surface-bg, transparent)" }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="qp-ticket-face truncate text-xl font-semibold"
                  style={{ color: activeTicket.type === "priority" ? C.coral : palette.fontColor }}
                >
                  {activeTicket.label} {activeTicket.name ? `· ${activeTicket.name}` : ""}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: ticketStyle(activeTicket._deskStatus, palette).accent }}>
                  {activeTicket._deskStatus}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedTicket(null)}
                className="qp-focusable rounded-md px-2 py-1 text-xs"
                style={{ color: withAlpha(palette.fontColor, "80"), background: withAlpha(palette.fontColor, "0a") }}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2" style={{ color: withAlpha(palette.fontColor, "80") }}>
              <span className="truncate">Position {activeTicket._deskPosition}</span>
              <span className="truncate">{activeTicket.phone || "No phone"}</span>
              <span className="truncate">{serviceName ? serviceName(activeTicket.serviceId) : activeTicket.serviceId || "General"}</span>
              <span className="truncate">{activeTicket._deskStatus === "waiting" || activeTicket._deskStatus === "called" ? "Waiting" : "Updated"} {activeTicket._deskTime ? elapsedLabel(now - activeTicket._deskTime) : "0s"} ago</span>
            </div>

            {activeTicket.name && (
              <div className="mt-3 rounded-md border px-3 py-2 text-xs" style={{ borderColor: palette.borderColor, background: withAlpha(palette.fontColor, "08"), color: withAlpha(palette.fontColor, "70") }}>
                Customer: {activeTicket.name}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DeskBreakdownSection({
  embedded = false,
  theme,
  desks,
  members = [],
  deskWord,
  deskWordPluralLower,
  servedByDesk,
  absentByDesk,
  removedByDesk,
  waitingByDesk,
  sortedQueue = [],
  sortedServed = [],
  absentList = [],
  removedLog = [],
  serviceName,
  now,
  getDeskPath,
}) {
  const palette = theme || {
    accentColor: C.blue,
    bgColor: C.ink800,
    fontColor: C.textLight,
    borderColor: C.hair,
    radius: 8,
  };
  const [ticketFilters, setTicketFilters] = useState({});
  const [expandedTicket, setExpandedTicket] = useState(null);
  const content = (
    <>
      {desks.length === 0 ? (
        <div className="text-sm py-4 text-center" style={{ color: C.textFaint }}>
          No {deskWordPluralLower} defined.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {desks.map((desk) => {
            const served = servedByDesk[desk.id] || 0;
            const absent = absentByDesk[desk.id] || 0;
            const removed = removedByDesk[desk.id] || 0;
            const waiting = waitingByDesk[desk.id] || 0;
            const assignedMembers = members.filter((member) => Array.isArray(member.deskIds) && member.deskIds.map(String).includes(String(desk.id)));
            const currentTicket = desk.current || null;
            const activeFilter = ticketFilters[desk.id] || "waiting";
            const deskTickets = normalizeDeskTickets({ desk, sortedQueue, sortedServed, absentList, removedLog });
            const statusState = deskStatusState(desk, now);
            const StatusIcon = statusState.Icon;
            const totalPrimary = served + waiting;
            const servedPct = totalPrimary > 0 ? Math.round((served / totalPrimary) * 100) : 0;
            const deskPath = getDeskPath ? getDeskPath(desk) : "/";
            const setDeskFilter = (filter) => {
              setTicketFilters((current) => ({ ...current, [desk.id]: filter }));
              setExpandedTicket(null);
            };

            return (
              <div key={desk.id} className="min-w-0">
                <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 py-2.5 md:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]">
                  <div
                    className="flex min-h-[108px] min-w-0 w-full flex-col gap-2.5 rounded-md border px-3 py-2.5"
                    style={{ borderColor: palette.borderColor, background: "var(--surface-bg, transparent)" }}
                  >
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="flex w-full min-w-0 items-center">
                        <a
                          href={deskPath}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${desk.name} desk page in a new tab`}
                          title={deskPath}
                          className="qp-focusable inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 text-left"
                          style={{ color: palette.fontColor }}
                        >
                          <StatusIcon size={16} className="shrink-0" style={{ color: statusState.color }} aria-label={statusState.label} />
                          <span className="min-w-0 truncate text-lg font-semibold leading-none">{desk.name}</span>
                          <ExternalLink size={13} className="shrink-0" style={{ color: withAlpha(palette.fontColor, "66") }} />
                        </a>
                      </div>
                      <div className="min-h-7">
                        {assignedMembers.length > 0 && (
                          <div className="flex min-w-0 items-center overflow-hidden text-[12px]" style={{ color: withAlpha(palette.fontColor, "80") }}>
                            {assignedMembers.length === 1 ? (
                              <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
                                <MemberAvatar member={assignedMembers[0]} palette={palette} size="h-7 w-7" />
                                <span className="max-w-[11rem] truncate leading-none" style={{ color: withAlpha(palette.fontColor, "70") }}>{assignedMembers[0].name}</span>
                              </span>
                            ) : (
                              <span className="inline-flex max-w-full min-w-0 items-center gap-2">
                                <span className="flex shrink-0 -space-x-2">
                                  {assignedMembers.slice(0, 4).map((member, index) => (
                                    <span key={member.id} className="relative shrink-0" style={{ zIndex: 4 - index }}>
                                      <MemberAvatar member={member} palette={palette} size="h-7 w-7" />
                                    </span>
                                  ))}
                                </span>
                                <span className="min-w-0 truncate text-xs font-medium leading-none" style={{ color: withAlpha(palette.fontColor, "70") }}>
                                  {assignedMembers.length} members
                                </span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-2">
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: withAlpha(palette.fontColor, "12") }}>
                        {totalPrimary > 0 ? (
                          <div className="flex h-full w-full">
                            {served === 0 ? (
                                <div className="h-full w-full" style={{ background: withAlpha(palette.fontColor, "30") }} />
                            ) : waiting === 0 ? (
                                <div className="h-full w-full" style={{ background: withAlpha(C.teal, "47") }} />
                            ) : (
                              <>
                                <div className="h-full" style={{ width: `${servedPct}%`, background: C.teal }} />
                                <div className="h-full" style={{ width: `${100 - servedPct}%`, background: withAlpha(palette.fontColor, "38") }} />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="h-full w-full" style={{ backgroundColor: "rgba(91,98,112,0.06)" }} />
                        )}
                      </div>

                      <div
                        className={`grid w-full min-w-0 gap-2 pb-1 text-xs qp-mono ${removed > 0 ? "grid-cols-4" : "grid-cols-3"}`}
                        style={{ color: withAlpha(palette.fontColor, "66") }}
                      >
                        <DeskFilterButton active={activeFilter === "served"} color={C.teal} count={served} label="served" onClick={() => setDeskFilter("served")} palette={palette} />
                        <DeskFilterButton active={activeFilter === "waiting"} color={C.amber} count={waiting} label="waiting" onClick={() => setDeskFilter("waiting")} palette={palette} />
                        <DeskFilterButton active={activeFilter === "absent"} color={C.coral} count={absent} label="absent" onClick={() => setDeskFilter("absent")} palette={palette} />
                        {removed > 0 && <DeskFilterButton active={activeFilter === "removed"} color={withAlpha(palette.fontColor, "80")} count={removed} label="removed" onClick={() => setDeskFilter("removed")} palette={palette} />}
                      </div>
                    </div>
                  </div>

                  <div className="flex h-full min-w-0 self-stretch">
                    <DeskTicketRail
                      tickets={deskTickets}
                      activeFilter={activeFilter}
                      expandedTicket={expandedTicket}
                      setExpandedTicket={setExpandedTicket}
                      serviceName={serviceName}
                      now={now}
                      theme={palette}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="qp-panel-card mt-3" style={{ background: "var(--surface-bg, transparent)", borderColor: palette.borderColor }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: withAlpha(palette.fontColor, "80") }}>
          <LayoutGrid size={13} />
          {deskWord} breakdown
        </div>
      </div>
      {content}
    </div>
  );
}
