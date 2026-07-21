import { DeskConsoleCard } from "./DeskConsoleCard";
import { TicketTabsPanel } from "./TicketTabsPanel";

export function DeskPage({
  desk,
  desks,
  services,
  serviceName,
  labels,
  now,
  queue,
  sortedQueue,
  eligibleForDesk,
  expandedDeskControl,
  setExpandedDeskControl,
  deskDetailTab,
  setDeskDetailTab,
  deskActions,
  ticketLogs,
  returnToQueue,
  askConfirm,
}) {
  const { deskWord, deskWordLower, serviceWord, serviceWordLower, serviceWordPluralLower } = labels;
  const { servedByDesk, absentByDesk, removedByDesk, servedByDeskService, absentByDeskService, removedByDeskService, absentList, sortedServed, removeAbsent } = ticketLogs;

  return (
    <main className="qp-page-shell">
      <section className="grid gap-5">
        <div className="grid gap-4">
          <DeskConsoleCard
            desk={desk}
            now={now}
            isExpanded={expandedDeskControl === desk.id}
            onToggleExpanded={() => setExpandedDeskControl(expandedDeskControl === desk.id ? null : desk.id)}
            services={services}
            serviceName={serviceName}
            serviceWord={serviceWord}
            serviceWordLower={serviceWordLower}
            serviceWordPluralLower={serviceWordPluralLower}
            deskWordLower={deskWordLower}
            queue={queue}
            eligibleForDesk={eligibleForDesk}
            completingDesk={deskActions.completingDesk}
            startingDesk={deskActions.startingDesk}
            skippingDesk={deskActions.skippingDesk}
            justRevealedDesk={deskActions.justRevealedDesk}
            callNext={deskActions.callNext}
            startService={deskActions.startService}
            completeTicket={deskActions.completeTicket}
            skipTicket={deskActions.skipTicket}
            toggleDeskLock={deskActions.toggleDeskLock}
            askConfirm={askConfirm}
            servedByDesk={servedByDesk}
            absentByDesk={absentByDesk}
            removedByDesk={removedByDesk}
            servedByDeskService={servedByDeskService}
            absentByDeskService={absentByDeskService}
            removedByDeskService={removedByDeskService}
          />

          <TicketTabsPanel
            desks={desks}
            selectedDeskFilter={String(desk.id)}
            deskDetailTab={deskDetailTab}
            setDeskDetailTab={setDeskDetailTab}
            sortedQueue={sortedQueue}
            absentList={absentList}
            sortedServed={sortedServed}
            eligibleForDesk={eligibleForDesk}
            now={now}
            serviceName={serviceName}
            deskWord={deskWord}
            returnToQueue={returnToQueue}
            removeAbsent={removeAbsent}
          />
        </div>
      </section>
    </main>
  );
}
