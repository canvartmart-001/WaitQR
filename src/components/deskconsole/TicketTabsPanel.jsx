import { SquareMenu } from "lucide-react";
import { C } from "../../lib/theme";
import { WaitingTab } from "./WaitingTab";
import { AbsentTab } from "./AbsentTab";
import { ServedTab } from "./ServedTab";

export function TicketTabsPanel({
  desks,
  selectedDeskFilter,
  deskDetailTab,
  setDeskDetailTab,
  sortedQueue,
  absentList,
  sortedServed,
  eligibleForDesk,
  now,
  serviceName,
  deskWord,
  returnToQueue,
  removeAbsent,
}) {
  const queueList = sortedQueue || [];
  const selectedDesk = selectedDeskFilter ? desks.find((desk) => String(desk.id) === String(selectedDeskFilter)) || null : null;
  const calledNotStartedTickets = desks
    .filter((d) => d.current && !d.current.startedAt)
    .map((d) => ({ ...d.current, _calledFromDeskId: d.id, _isCalled: true }));
  const filteredWaiting = selectedDesk
    ? [
        ...calledNotStartedTickets.filter((ticket) => ticket._calledFromDeskId === selectedDesk.id),
        ...queueList.filter(eligibleForDesk ? eligibleForDesk(selectedDesk) : () => true),
      ]
    : [...calledNotStartedTickets, ...queueList];
  const filteredAbsent = selectedDesk
    ? absentList.filter((ticket) => ticket.skippedFromDesk == null || String(ticket.skippedFromDesk) === String(selectedDesk.id))
    : absentList;
  const filteredServed = selectedDesk
    ? sortedServed.filter((ticket) => ticket.deskId == null || String(ticket.deskId) === String(selectedDesk.id))
    : sortedServed;
  const waitingCount = filteredWaiting.length;
  const activeTitle = deskDetailTab === "waiting" ? "Waiting list" : deskDetailTab === "absent" ? "Absent tickets" : "Served tickets";
  const activePanel = deskDetailTab === "waiting"
    ? <WaitingTab filteredWaiting={filteredWaiting} now={now} serviceName={serviceName} desks={desks} deskWord={deskWord} />
    : deskDetailTab === "absent"
      ? <AbsentTab filteredAbsent={filteredAbsent} now={now} serviceName={serviceName} returnToQueue={returnToQueue} removeAbsent={removeAbsent} />
      : <ServedTab filteredServed={filteredServed} now={now} serviceName={serviceName} desks={desks} deskWord={deskWord} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textMuted }}>
          <SquareMenu size={13} strokeWidth={1.75} />
          {activeTitle}
        </div>
      </div>

      <div className="qp-tabbar" style={{ background: C.ink900 }}>
        {[
          { key: "waiting", label: "Waiting", count: waitingCount },
          { key: "absent", label: "Absent", count: filteredAbsent.length },
          { key: "served", label: "Served", count: filteredServed.length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDeskDetailTab(tab.key)}
            className="qp-focusable flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-2 py-2 rounded-md"
            style={{
              background: deskDetailTab === tab.key ? C.ink700 : "transparent",
              color: deskDetailTab === tab.key ? C.textLight : C.textFaint,
            }}
          >
            {tab.label}
            <span className="qp-mono text-[10px]" style={{ color: deskDetailTab === tab.key ? C.amber : C.textFaint }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden pt-3">{activePanel}</div>
    </div>
  );
}
