import { ArrowLeft, Link2 } from "lucide-react";
import { C } from "../../lib/theme";
import { DeskConsoleCard } from "./DeskConsoleCard";
import { TicketTabsPanel } from "./TicketTabsPanel";

export function DeskPage({
  desk,
  deskPath,
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
  onNavigate,
}) {
  const { deskWord, deskWordLower, serviceWord, serviceWordLower, serviceWordPluralLower } = labels;
  const { servedByDesk, absentByDesk, removedByDesk, servedByDeskService, absentByDeskService, removedByDeskService, absentList, sortedServed, removeAbsent } = ticketLogs;

  return (
    <main className="qp-page-shell">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="grid gap-4">
          <button
            type="button"
            onClick={() => onNavigate("/")}
            className="qp-focusable inline-flex w-fit items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
            style={{ borderColor: C.ink600, color: C.textLight, background: "rgba(255,255,255,0.02)" }}
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

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

        <div
          className="qp-section-card grid gap-4"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            borderColor: C.ink600,
          }}
        >
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
              {deskWord}
            </div>
            <h2 className="mt-2 text-2xl font-semibold" style={{ color: C.textLight }}>
              {desk.name}
            </h2>
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs qp-mono" style={{ borderColor: C.ink600, color: C.textMuted }}>
              <Link2 size={13} />
              {deskPath}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border p-4" style={{ borderColor: C.ink600, background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textFaint }}>
                Status
              </div>
              <div className="mt-2 text-lg font-semibold" style={{ color: desk.locked ? C.coral : C.teal }}>
                {desk.locked ? "Closed" : "Open"}
              </div>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: C.ink600, background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textFaint }}>
                Waiting
              </div>
              <div className="mt-2 text-2xl font-semibold" style={{ color: C.textLight }}>
                {sortedQueue.filter(eligibleForDesk(desk)).length}
              </div>
            </div>
            <div className="rounded-lg border p-4" style={{ borderColor: C.ink600, background: "rgba(255,255,255,0.02)" }}>
              <div className="text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textFaint }}>
                Services
              </div>
              <div className="mt-2 text-lg font-semibold" style={{ color: C.textLight }}>
                {desk.services.length === 0 ? "None" : desk.services.length}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
