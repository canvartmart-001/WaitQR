import { DeskConsoleCard } from "./DeskConsoleCard";
import { TicketTabsPanel } from "./TicketTabsPanel";

function hexToRgb(hex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return null;
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return from;
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function isLightHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 180;
}

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
  waitEstimatesByTicketId,
  recallAbsent,
  cancelRecallRequest,
  recallServed,
  askConfirm,
  adminLayout = false,
  loggedInMember = null,
}) {
  const { deskWord, deskWordLower, serviceWord, serviceWordLower, serviceWordPluralLower } = labels;
  const { servedByDeskService, absentByDeskService, removedByDeskService, absentList, sortedServed, removeAbsent } = ticketLogs;
  const queuedCalledTickets = Array.isArray(desk.calledTickets) ? desk.calledTickets : [];
  const recallRequestedTickets = absentList
    .filter((ticket) =>
      ticket.recallRequestedAt
      && ticket.skippedFromDesk != null
      && String(ticket.skippedFromDesk) === String(desk.id)
    )
    .sort((a, b) => a.recallRequestedAt - b.recallRequestedAt);
  const recallRequestedTicket = !desk.current ? recallRequestedTickets[0] || null : null;
  const additionalRecallRequests = desk.current
    ? recallRequestedTickets
    : recallRequestedTickets.slice(1);
  const pageBackground = isLightHex(theme?.bgColor)
    ? mixHex(mixHex(theme.bgColor, theme.accentColor || theme.bgColor, 0.035), "#94a3b8", 0.08)
    : mixHex(theme?.bgColor, "#000000", 0.45);

  return (
    <main
      className={`qp-page-shell qp-desk-page-shell${adminLayout ? " qp-desk-page-shell-admin" : ""}`}
      style={{ backgroundColor: pageBackground }}
    >
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
            recallPreview={recallRequestedTicket}
            recallTicket={recallAbsent}
            cancelRecallRequest={cancelRecallRequest}
            askConfirm={askConfirm}
            updateDesk={deskActions.updateDesk}
            hideInCardCounterStatus
            showCounterStatusAbove
          />
          {queuedCalledTickets.length > 0 || additionalRecallRequests.length > 0 ? (
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
                  askConfirm={askConfirm}
                  updateDesk={() => {}}
                  actionDeskId={desk.id}
                  actionTicketId={ticket.id}
                  allowCounterStatusControls={false}
                  showCounterStatusButton={false}
                />
              ))}
              {additionalRecallRequests.map((ticket) => (
                <DeskConsoleCard
                  key={`recall-${ticket.id}`}
                  desk={{
                    ...desk,
                    name: desk.name,
                    current: null,
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
                  recallPreview={ticket}
                  recallTicket={recallAbsent}
                  cancelRecallRequest={cancelRecallRequest}
                  callNext={() => {}}
                  startService={deskActions.startTicketService}
                  completeTicket={deskActions.completeActiveTicket}
                  skipTicket={deskActions.skipActiveTicket}
                  askConfirm={askConfirm}
                  updateDesk={() => {}}
                  actionDeskId={desk.id}
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
            waitEstimatesByTicketId={waitEstimatesByTicketId}
            recallAbsent={recallAbsent}
            recallServed={recallServed}
            removeAbsent={removeAbsent}
            askConfirm={askConfirm}
            servedByDeskService={servedByDeskService}
            absentByDeskService={absentByDeskService}
            removedByDeskService={removedByDeskService}
            memberServiceFilter={!adminLayout ? loggedInMember?.serviceIds : null}
          />
        </div>
      </section>
    </main>
  );
}
