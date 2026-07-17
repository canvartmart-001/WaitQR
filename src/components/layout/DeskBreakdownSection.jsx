import { useEffect, useRef, useState } from "react";
import { ExternalLink, LayoutGrid, User } from "lucide-react";
import { C } from "../../lib/theme";
import { elapsedLabel } from "../../lib/format";
import { orderTicketsForDesk } from "../../hooks/useQueue";

function ticketStyle(status) {
  if (status === "called") return { borderColor: "rgba(232,163,61,0.42)", background: C.amberSoft, accent: C.amber, text: C.textLight };
  if (status === "serving" || status === "served") return { borderColor: "rgba(79,178,134,0.42)", background: C.tealSoft, accent: C.teal, text: C.textLight };
  if (status === "absent" || status === "removed") return { borderColor: "rgba(226,97,79,0.42)", background: C.coralSoft, accent: C.coral, text: C.textLight };
  return { borderColor: C.ink700, background: "rgba(18,21,27,0.56)", accent: C.textMuted, text: C.textMuted };
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
    .filter((ticket) => ticket.deskId == null || String(ticket.deskId) === String(desk.id))
    .map((ticket, index) => ({
      ...ticket,
      _deskCardKey: `served-${desk.id}-${ticket.id || ticket.label}-${ticket.completedAt || index}`,
      _deskStatus: "served",
      _deskPosition: index + 1,
      _deskTime: ticket.completedAt,
      _deskGroup: "served",
    }));

  const absentCards = absentList
    .filter((ticket) => ticket.skippedFromDesk == null || String(ticket.skippedFromDesk) === String(desk.id))
    .map((ticket, index) => ({
      ...ticket,
      _deskCardKey: `absent-${desk.id}-${ticket.id || ticket.label}-${ticket.skippedAt || index}`,
      _deskStatus: "absent",
      _deskPosition: index + 1,
      _deskTime: ticket.skippedAt,
      _deskGroup: "absent",
    }));

  const removedCards = removedLog
    .filter((ticket) => ticket.deskId == null || String(ticket.deskId) === String(desk.id))
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

function DeskFilterButton({ active, color, count, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="qp-focusable flex w-full items-center justify-center gap-1 rounded-md px-2 py-1.5 text-center text-[13px] leading-none"
      style={{ color: active ? color : C.textFaint, background: active ? "rgba(255,255,255,0.04)" : "transparent" }}
    >
      <span>{count}</span>
      <span>{label}</span>
    </button>
  );
}

function DeskTicketRail({ tickets, activeFilter, expandedTicket, setExpandedTicket, serviceName, now }) {
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
      <div className="flex min-h-[62px] flex-1 items-center px-1 py-2.5 text-xs" style={{ color: C.textFaint }}>
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
          const styles = ticketStyle(ticket._deskStatus);
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
                background: isActive ? "rgba(255,255,255,0.08)" : styles.background,
                color: styles.text,
                boxShadow: isActive ? `0 0 0 1px ${styles.accent} inset` : "none",
              }}
            >
              <span className="qp-ticket-face text-[2.25rem] font-semibold leading-none justify-self-center" style={{ color: isPrimaryHighlight ? C.textLight : C.textMuted, fontVariantNumeric: "tabular-nums" }}>
                {ticket._deskPosition}
              </span>
              <span className="min-w-0 self-center text-left">
                <span
                  className="qp-ticket-face block truncate font-semibold leading-tight"
                  style={{
                    color: isPrimaryHighlight ? C.textLight : C.textMuted,
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
            style={{ borderColor: ticketStyle(activeTicket._deskStatus).accent, background: C.ink800 }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="qp-ticket-face truncate text-xl font-semibold"
                  style={{ color: activeTicket.type === "priority" ? C.coral : C.textLight }}
                >
                  {activeTicket.label} {activeTicket.name ? `· ${activeTicket.name}` : ""}
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: ticketStyle(activeTicket._deskStatus).accent }}>
                  {activeTicket._deskStatus}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedTicket(null)}
                className="qp-focusable rounded-md px-2 py-1 text-xs"
                style={{ color: C.textMuted, background: "rgba(255,255,255,0.04)" }}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2" style={{ color: C.textMuted }}>
              <span className="truncate">Position {activeTicket._deskPosition}</span>
              <span className="truncate">{activeTicket.phone || "No phone"}</span>
              <span className="truncate">{serviceName ? serviceName(activeTicket.serviceId) : activeTicket.serviceId || "General"}</span>
              <span className="truncate">{activeTicket._deskStatus === "waiting" || activeTicket._deskStatus === "called" ? "Waiting" : "Updated"} {activeTicket._deskTime ? elapsedLabel(now - activeTicket._deskTime) : "0s"} ago</span>
            </div>

            {activeTicket.name && (
              <div className="mt-3 rounded-md border px-3 py-2 text-xs" style={{ borderColor: C.ink700, background: C.ink900, color: C.textFaint }}>
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
                    style={{ borderColor: C.hair, background: C.ink800 }}
                  >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="flex w-full min-w-0 items-center gap-3">
                        <a
                          href={deskPath}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${desk.name} desk page in a new tab`}
                          title={deskPath}
                          className="qp-focusable flex shrink-0 items-center gap-1.5 text-left"
                          style={{ color: C.textLight }}
                        >
                          <span className={`${currentTicket?.startedAt ? "qp-livedot" : ""} h-1.5 w-1.5 shrink-0 rounded-full`} aria-hidden="true" style={{ background: currentTicket ? C.teal : desk.locked ? C.coral : C.teal }} />
                          <span className="truncate text-lg font-semibold leading-none">{desk.name}</span>
                          <ExternalLink size={13} style={{ color: C.textFaint }} />
                        </a>
                        {assignedMembers.length > 0 && (
                          <div className="flex min-w-0 flex-1 items-center gap-x-3 overflow-hidden text-[12px]" style={{ color: C.textMuted }}>
                            {assignedMembers.map((member) => (
                              <span
                                key={member.id}
                                className="inline-flex min-w-0 max-w-full shrink items-center gap-1.5"
                              >
                                <span
                                  className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border"
                                  style={{ borderColor: C.ink600, background: C.ink900 }}
                                >
                                  {member.photo ? (
                                    <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <User size={14} style={{ color: C.textFaint }} />
                                  )}
                                </span>
                                <span className="max-w-[72px] truncate leading-none sm:max-w-[88px]" style={{ color: C.textFaint }}>{member.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-2">
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.ink700 }}>
                        {totalPrimary > 0 ? (
                          <div className="flex h-full w-full">
                            {served === 0 ? (
                              <div className="h-full w-full" style={{ background: "rgba(91,98,112,0.55)" }} />
                            ) : waiting === 0 ? (
                              <div className="h-full w-full" style={{ background: "rgba(79,178,134,0.28)" }} />
                            ) : (
                              <>
                                <div className="h-full" style={{ width: `${servedPct}%`, background: C.teal }} />
                                <div className="h-full" style={{ width: `${100 - servedPct}%`, background: "rgba(91,98,112,0.7)" }} />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="h-full w-full" style={{ backgroundColor: "rgba(91,98,112,0.06)" }} />
                        )}
                      </div>

                      <div
                        className={`grid w-full min-w-0 gap-2 pb-1 text-xs qp-mono ${removed > 0 ? "grid-cols-4" : "grid-cols-3"}`}
                        style={{ color: C.textFaint }}
                      >
                        <DeskFilterButton active={activeFilter === "served"} color={C.teal} count={served} label="served" onClick={() => setDeskFilter("served")} />
                        <DeskFilterButton active={activeFilter === "waiting"} color={C.amber} count={waiting} label="waiting" onClick={() => setDeskFilter("waiting")} />
                        <DeskFilterButton active={activeFilter === "absent"} color={C.coral} count={absent} label="absent" onClick={() => setDeskFilter("absent")} />
                        {removed > 0 && <DeskFilterButton active={activeFilter === "removed"} color={C.textMuted} count={removed} label="removed" onClick={() => setDeskFilter("removed")} />}
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
    <div className="qp-panel-card mt-3" style={{ background: C.ink800, borderColor: C.hair }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textMuted }}>
          <LayoutGrid size={13} />
          {deskWord} breakdown
        </div>
      </div>
      {content}
    </div>
  );
}
