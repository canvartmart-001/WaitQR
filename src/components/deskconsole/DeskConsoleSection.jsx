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
  callTicket,
  recallAbsent,
  recallServed,
  askConfirm,
  waitEstimatesByTicketId,
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
        callTicket={callTicket}
        waitEstimatesByTicketId={waitEstimatesByTicketId}
        recallAbsent={recallAbsent}
        recallServed={recallServed}
        removeAbsent={removeAbsent}
        askConfirm={askConfirm}
      />
    </section>
  );
}
