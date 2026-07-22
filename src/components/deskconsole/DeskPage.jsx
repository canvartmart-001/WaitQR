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
  deskDetailTab,
  setDeskDetailTab,
  deskActions,
  ticketLogs,
  recallAbsent,
  recallServed,
  askConfirm,
}) {
  const { deskWord, deskWordLower, serviceWord, serviceWordLower, serviceWordPluralLower } = labels;
  const { servedByDeskService, absentByDeskService, removedByDeskService, absentList, sortedServed, removeAbsent } = ticketLogs;
  const queuedCalledTickets = Array.isArray(desk.calledTickets) ? desk.calledTickets : [];

  return (
    <main className="qp-page-shell qp-desk-page-shell">
      <section className="qp-desk-page-layout">
        <div className="qp-desk-page-counter">
          <DeskConsoleCard
            desk={desk}
            now={now}
            serviceName={serviceName}
            theme={theme}
            serviceWord={serviceWord}
            serviceWordLower={serviceWordLower}
            serviceWordPluralLower={serviceWordPluralLower}
            deskWordLower={deskWordLower}
            queue={queue}
            eligibleForDesk={eligibleForDesk}
            completingDesk={deskActions.completingDesk}
            completingTicket={deskActions.completingTicket}
            startingDesk={deskActions.startingDesk}
            startingTicket={deskActions.startingTicket}
            skippingDesk={deskActions.skippingDesk}
            skippingTicket={deskActions.skippingTicket}
            callNext={deskActions.callNext}
            startService={deskActions.startTicketService}
            completeTicket={deskActions.completeActiveTicket}
            skipTicket={deskActions.skipActiveTicket}
            updateDesk={deskActions.updateDesk}
            hideInCardCounterStatus
            showCounterStatusAbove
          />
          {queuedCalledTickets.length > 0 ? (
            <div className="mt-4 flex flex-col gap-4">
              {queuedCalledTickets.map((ticket) => (
                <DeskConsoleCard
                  key={ticket.id}
                  desk={{
                    ...desk,
                    name: desk.name,
                    current: ticket,
                    calledTickets: [],
                  }}
                  now={now}
                  serviceName={serviceName}
                  theme={theme}
                  serviceWord={serviceWord}
                  serviceWordLower={serviceWordLower}
                  serviceWordPluralLower={serviceWordPluralLower}
                  deskWordLower={deskWordLower}
                  queue={[]}
                  eligibleForDesk={() => () => false}
                  completingDesk={deskActions.completingDesk}
                  completingTicket={deskActions.completingTicket}
                  startingDesk={deskActions.startingDesk}
                  startingTicket={deskActions.startingTicket}
                  skippingDesk={deskActions.skippingDesk}
                  skippingTicket={deskActions.skippingTicket}
                  callNext={() => {}}
                  startService={deskActions.startTicketService}
                  completeTicket={deskActions.completeActiveTicket}
                  skipTicket={deskActions.skipActiveTicket}
                  updateDesk={() => {}}
                  actionDeskId={desk.id}
                  actionTicketId={ticket.id}
                  allowCounterStatusControls={false}
                  showCounterStatusButton={false}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="qp-desk-page-waiting">
          <TicketTabsPanel
            desks={desks}
            selectedDeskFilter={desk.id}
            theme={theme}
            deskDetailTab={deskDetailTab}
            setDeskDetailTab={setDeskDetailTab}
            sortedQueue={sortedQueue}
            absentList={absentList}
            sortedServed={sortedServed}
            services={services}
            eligibleForDesk={eligibleForDesk}
            now={now}
            serviceName={serviceName}
            serviceWordPluralLower={serviceWordPluralLower}
            deskWord={deskWord}
            callTicket={deskActions.callTicket}
            recallAbsent={recallAbsent}
            recallServed={recallServed}
            removeAbsent={removeAbsent}
            askConfirm={askConfirm}
            servedByDeskService={servedByDeskService}
            absentByDeskService={absentByDeskService}
            removedByDeskService={removedByDeskService}
          />
        </div>
      </section>
    </main>
  );
}
