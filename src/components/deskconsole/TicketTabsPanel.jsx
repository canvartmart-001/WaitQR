import { C } from "../../lib/theme";
import { WaitingTab } from "./WaitingTab";
import { AbsentTab } from "./AbsentTab";
import { ServedTab } from "./ServedTab";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function TicketTabsPanel({
  desks,
  theme,
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
  callTicket,
  recallAbsent,
  recallServed,
  removeAbsent,
  askConfirm,
}) {
  const queueList = sortedQueue || [];
  const selectedDesk = selectedDeskFilter ? desks.find((desk) => String(desk.id) === String(selectedDeskFilter)) || null : null;
  const queuedWaiting = selectedDesk
    ? queueList.filter(eligibleForDesk ? eligibleForDesk(selectedDesk) : () => true)
    : queueList;
  const filteredWaiting = queuedWaiting;
  const filteredAbsent = (selectedDesk
    ? absentList.filter((ticket) => ticket.skippedFromDesk != null && String(ticket.skippedFromDesk) === String(selectedDesk.id))
    : absentList
  ).sort((a, b) => (a.skippedAt || 0) - (b.skippedAt || 0));
  const filteredServed = selectedDesk
    ? sortedServed.filter((ticket) => ticket.deskId != null && String(ticket.deskId) === String(selectedDesk.id))
    : sortedServed;
  const waitingCount = filteredWaiting.length;
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const activeTabBackground = withAlpha(surfaceTheme.fontColor, "12");
  const activePanel = deskDetailTab === "waiting"
    ? <WaitingTab filteredWaiting={filteredWaiting} queuedWaiting={queuedWaiting} selectedDesk={selectedDesk} now={now} serviceName={serviceName} desks={desks} deskWord={deskWord} callTicket={callTicket} theme={surfaceTheme} />
    : deskDetailTab === "absent"
      ? <AbsentTab filteredAbsent={filteredAbsent} desks={desks} now={now} serviceName={serviceName} recallAbsent={recallAbsent} removeAbsent={removeAbsent} askConfirm={askConfirm} theme={surfaceTheme} />
      : <ServedTab filteredServed={filteredServed} now={now} serviceName={serviceName} desks={desks} deskWord={deskWord} recallServed={recallServed} askConfirm={askConfirm} theme={surfaceTheme} />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-start gap-1.5">
        {[
          { key: "waiting", label: "Waiting", count: waitingCount, countColor: C.blue },
          { key: "absent", label: "Absent", count: filteredAbsent.length, countColor: C.coral },
          { key: "served", label: "Served", count: filteredServed.length, countColor: C.teal },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDeskDetailTab(tab.key)}
            className="qp-focusable inline-flex h-7 items-center justify-center gap-1.5 px-2.5 text-xs font-medium transition-colors hover:bg-white/5"
            style={{
              background: deskDetailTab === tab.key ? activeTabBackground : "transparent",
              color: deskDetailTab === tab.key ? surfaceTheme.fontColor : faintColor,
              borderRadius: surfaceTheme.radius,
            }}
          >
            {tab.label}
            <span className="qp-mono text-[10px]" style={{ color: deskDetailTab === tab.key ? tab.countColor : faintColor }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">{activePanel}</div>
    </div>
  );
}
