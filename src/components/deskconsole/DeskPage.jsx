import { DeskConsoleCard } from "./DeskConsoleCard";
import { TicketTabsPanel } from "./TicketTabsPanel";

export function DeskPage({
  desk,
  desks,
  services,
  serviceName,
  labels,
  theme,
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
}) {
  const { deskWord, deskWordLower, serviceWord, serviceWordLower, serviceWordPluralLower } = labels;
  const { servedByDesk, absentByDesk, removedByDesk, servedByDeskService, absentByDeskService, removedByDeskService, absentList, sortedServed, removeAbsent } = ticketLogs;

  return (
    <main className="qp-page-shell qp-desk-page-shell">
      <section className="qp-desk-page-layout">
        <div className="qp-desk-page-counter">
          <DeskConsoleCard
            desk={desk}
            now={now}
            isExpanded={expandedDeskControl === desk.id}
            onToggleExpanded={() => setExpandedDeskControl(expandedDeskControl === desk.id ? null : desk.id)}
            services={services}
            serviceName={serviceName}
            theme={theme}
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
            updateDesk={deskActions.updateDesk}
            servedByDesk={servedByDesk}
            absentByDesk={absentByDesk}
            removedByDesk={removedByDesk}
            servedByDeskService={servedByDeskService}
            absentByDeskService={absentByDeskService}
            removedByDeskService={removedByDeskService}
          />
        </div>

        <div className="qp-desk-page-waiting">
          <TicketTabsPanel
            desks={desks}
            theme={theme}
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
