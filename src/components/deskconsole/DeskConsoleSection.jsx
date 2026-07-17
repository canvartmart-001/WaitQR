import { TicketTabsPanel } from "./TicketTabsPanel";

export function DeskConsoleSection({
  desks,
  serviceName,
  labels,
  now,
  sortedQueue,
  deskDetailTab,
  setDeskDetailTab,
  ticketLogs,
  returnToQueue,
}) {
  const { deskWord } = labels;
  const { absentList, sortedServed, removeAbsent } = ticketLogs;

  return (
    <section className="qp-console-stack h-full">
      <TicketTabsPanel
        desks={desks}
        deskDetailTab={deskDetailTab}
        setDeskDetailTab={setDeskDetailTab}
        sortedQueue={sortedQueue}
        absentList={absentList}
        sortedServed={sortedServed}
        now={now}
        serviceName={serviceName}
        deskWord={deskWord}
        returnToQueue={returnToQueue}
        removeAbsent={removeAbsent}
      />
    </section>
  );
}
