import { Search, X } from "lucide-react";
import { useState } from "react";
import { C } from "../../lib/theme";
import { WaitingTab } from "./WaitingTab";
import { AbsentTab } from "./AbsentTab";
import { ServedTab } from "./ServedTab";
import { ServiceTab } from "./ServiceTab";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

function searchableText(parts) {
  return parts.filter((part) => part != null).join(" ").toLowerCase();
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
  services,
  eligibleForDesk,
  now,
  serviceName,
  serviceWordPluralLower,
  deskWord,
  callTicket,
  waitEstimatesByTicketId,
  recallAbsent,
  recallServed,
  removeAbsent,
  askConfirm,
  servedByDeskService,
  absentByDeskService,
  removedByDeskService,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const queueList = sortedQueue || [];
  const serviceList = services || [];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const selectedDesk = selectedDeskFilter ? desks.find((desk) => String(desk.id) === String(selectedDeskFilter)) || null : null;
  const queuedWaiting = selectedDesk
    ? queueList.filter(eligibleForDesk ? eligibleForDesk(selectedDesk) : () => true)
    : queueList;
  const baseWaiting = queuedWaiting;
  const baseAbsent = (selectedDesk
    ? absentList.filter((ticket) => ticket.skippedFromDesk != null && String(ticket.skippedFromDesk) === String(selectedDesk.id))
    : absentList
  ).sort((a, b) => (a.skippedAt || 0) - (b.skippedAt || 0));
  const baseServed = selectedDesk
    ? sortedServed.filter((ticket) => ticket.deskId != null && String(ticket.deskId) === String(selectedDesk.id))
    : sortedServed;
  const baseServices = selectedDesk
    ? serviceList.filter((service) => (selectedDesk.services || []).map(String).includes(String(service.id)))
    : serviceList;
  const ticketMatches = (ticket) =>
    !normalizedSearch || searchableText([ticket.label, ticket.name, ticket.phone, serviceName(ticket.serviceId), ticket.type]).includes(normalizedSearch);
  const filteredWaiting = baseWaiting.filter(ticketMatches);
  const filteredAbsent = baseAbsent.filter(ticketMatches);
  const filteredServed = baseServed.filter(ticketMatches);
  const filteredServices = baseServices.filter((service) =>
    !normalizedSearch || searchableText([service.name, service.description, service.status]).includes(normalizedSearch)
  );
  const waitingCount = filteredWaiting.length;
  const surfaceTheme = {
    accentColor: theme?.accentColor || C.blue,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const activeTabBackground = withAlpha(surfaceTheme.fontColor, "12");
  const tabs = [
    { key: "waiting", label: "Waiting", count: waitingCount, countColor: surfaceTheme.accentColor },
    { key: "absent", label: "Absent", count: filteredAbsent.length, countColor: C.coral },
    { key: "served", label: "Served", count: filteredServed.length, countColor: C.teal },
    { key: "service", label: "Service", count: filteredServices.length, countColor: C.teal },
  ];
  const activeTab = tabs.find((tab) => tab.key === deskDetailTab) || tabs[0];
  const searchPlaceholder = {
    waiting: "Search waiting",
    absent: "Search absent",
    served: "Search served",
    service: "Search service",
  }[deskDetailTab] || "Search";
  const activePanel = deskDetailTab === "waiting"
    ? <WaitingTab filteredWaiting={filteredWaiting} queuedWaiting={queuedWaiting} selectedDesk={selectedDesk} now={now} serviceName={serviceName} desks={desks} deskWord={deskWord} callTicket={callTicket} waitEstimatesByTicketId={waitEstimatesByTicketId} theme={surfaceTheme} />
    : deskDetailTab === "absent"
      ? <AbsentTab filteredAbsent={filteredAbsent} desks={desks} now={now} serviceName={serviceName} recallAbsent={recallAbsent} removeAbsent={removeAbsent} askConfirm={askConfirm} theme={surfaceTheme} />
      : deskDetailTab === "served"
        ? <ServedTab filteredServed={filteredServed} now={now} serviceName={serviceName} desks={desks} deskWord={deskWord} recallServed={recallServed} askConfirm={askConfirm} theme={surfaceTheme} />
        : <ServiceTab selectedDesk={selectedDesk} services={filteredServices} servedByDeskService={servedByDeskService} absentByDeskService={absentByDeskService} removedByDeskService={removedByDeskService} serviceWordPluralLower={serviceWordPluralLower} theme={surfaceTheme} />;

  return (
    <div className="qp-ticket-tabs-panel flex h-full min-h-0 flex-col">
      <div className="qp-ticket-tabs-header mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="grid w-full grid-cols-4 gap-1.5 sm:w-auto sm:flex sm:flex-wrap sm:items-center sm:justify-start">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDeskDetailTab(tab.key)}
              className="qp-focusable inline-flex min-h-[52px] min-w-0 flex-col items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-medium transition-colors hover:bg-white/5 sm:h-9 sm:min-h-0 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-0"
              style={{
                background: deskDetailTab === tab.key ? activeTabBackground : "transparent",
                color: deskDetailTab === tab.key ? surfaceTheme.fontColor : faintColor,
                borderRadius: surfaceTheme.radius,
              }}
            >
              <span className="leading-none">{tab.label}</span>
              <span className="qp-mono text-xs font-bold leading-none sm:text-[10px]" style={{ color: deskDetailTab === tab.key ? tab.countColor : faintColor }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="qp-tab-search-wrap relative w-full min-w-0 sm:ml-auto sm:w-auto sm:flex-[1_1_12rem] sm:max-w-[14rem]">
          <Search size={15} strokeWidth={2} className="qp-tab-search-icon pointer-events-none absolute" style={{ color: activeTab.countColor }} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={searchPlaceholder}
            className="qp-tab-search h-9 w-full rounded-md border text-sm outline-none"
            style={{
              "--qp-tab-search-focus-border": withAlpha(activeTab.countColor, "99"),
              "--qp-tab-search-placeholder": withAlpha(surfaceTheme.fontColor, "80"),
              background: activeTabBackground,
              borderColor: "transparent",
              color: surfaceTheme.fontColor,
              borderRadius: surfaceTheme.radius,
            }}
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="qp-focusable qp-tab-search-clear absolute flex h-5 w-5 items-center justify-center rounded-md"
              style={{ color: activeTab.countColor }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="qp-ticket-tabs-body min-h-0 flex-1 overflow-hidden">{activePanel}</div>
    </div>
  );
}
