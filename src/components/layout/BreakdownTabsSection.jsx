import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid, Tag } from "lucide-react";
import { C } from "../../lib/theme";
import { DeskBreakdownSection } from "./DeskBreakdownSection";
import { ServiceBreakdownSection } from "./ServiceBreakdownSection";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

export function BreakdownTabsSection({
  embedded = false,
  theme,
  services,
  desks,
  members = [],
  labels,
  servedByService,
  absentByService,
  removedByService,
  waitingByService,
  servedByDeskService,
  absentByDeskService,
  servedByDesk,
  absentByDesk,
  removedByDesk,
  waitingByDesk,
  waitingByDeskService,
  removedByDeskService,
  sortedQueue = [],
  sortedServed = [],
  absentList = [],
  removedLog = [],
  serviceName,
  now,
  getDeskPath,
  onNavigate,
}) {
  const [activeTab, setActiveTab] = useState("desks");
  const [selectorOpen, setSelectorOpen] = useState(false);
  const selectorRef = useRef(null);
  const palette = theme || {
    accentColor: C.amber,
    bgColor: C.ink900,
    fontColor: C.textLight,
    borderColor: C.hair,
  };
  const selectorOptions = [
    { key: "desks", label: "Desks", count: desks.length, icon: LayoutGrid },
    { key: "services", label: "Services", count: services.length, icon: Tag },
  ];
  const activeOption = selectorOptions.find((option) => option.key === activeTab) || selectorOptions[0];

  useEffect(() => {
    if (!selectorOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!selectorRef.current?.contains(event.target)) {
        setSelectorOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [selectorOpen]);

  const activePanel = activeTab === "desks" ? (
    <DeskBreakdownSection
      embedded
      desks={desks}
      members={members}
      services={services}
      deskWord={labels.deskWord}
      deskWordLower={labels.deskWordLower}
      deskWordPluralLower={labels.deskWordPluralLower}
      serviceWordLower={labels.serviceWordLower}
      serviceWordPluralLower={labels.serviceWordPluralLower}
      servedByDesk={servedByDesk}
      absentByDesk={absentByDesk}
      removedByDesk={removedByDesk}
      waitingByDesk={waitingByDesk}
      waitingByDeskService={waitingByDeskService}
      servedByDeskService={servedByDeskService}
      absentByDeskService={absentByDeskService}
      removedByDeskService={removedByDeskService}
      sortedQueue={sortedQueue}
      sortedServed={sortedServed}
      absentList={absentList}
      removedLog={removedLog}
      serviceName={serviceName}
      now={now}
      getDeskPath={getDeskPath}
      onNavigate={onNavigate}
    />
  ) : (
    <ServiceBreakdownSection
      embedded
      services={services}
      desks={desks}
      serviceWord={labels.serviceWord}
      serviceWordLower={labels.serviceWordLower}
      serviceWordPluralLower={labels.serviceWordPluralLower}
      deskWordLower={labels.deskWordLower}
      servedByService={servedByService}
      absentByService={absentByService}
      removedByService={removedByService}
      waitingByService={waitingByService}
      servedByDeskService={servedByDeskService}
      absentByDeskService={absentByDeskService}
    />
  );

  const content = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div ref={selectorRef} className="relative">
          <button
            type="button"
            onClick={() => setSelectorOpen((open) => !open)}
            className="qp-focusable flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em]"
            aria-haspopup="menu"
            aria-expanded={selectorOpen}
            style={{ color: withAlpha(palette.fontColor, "80") }}
          >
            <activeOption.icon size={13} />
            <span>{activeOption.key === "desks" ? `${labels.deskWord} breakdown` : `${labels.serviceWord} breakdown`}</span>
            <ChevronDown size={12} style={{ color: withAlpha(palette.fontColor, "70"), transform: selectorOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 160ms ease" }} />
          </button>

          {selectorOpen ? (
            <div
              role="menu"
              className="absolute left-0 top-full z-10 mt-2 min-w-[148px] rounded-md border p-1 shadow-lg"
              style={{ background: palette.bgColor, borderColor: palette.borderColor }}
            >
              {selectorOptions.map((option) => {
                const Icon = option.icon;
                const isActive = option.key === activeTab;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      setActiveTab(option.key);
                      setSelectorOpen(false);
                    }}
                    className="qp-focusable flex w-full items-center justify-between gap-3 rounded px-2 py-2 text-left text-xs"
                    style={{
                      background: isActive ? withAlpha(palette.accentColor, "1f") : "transparent",
                      color: isActive ? palette.fontColor : withAlpha(palette.fontColor, "80"),
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Icon size={12} />
                      <span>{option.label}</span>
                    </span>
                    <span className="qp-mono text-[10px]" style={{ color: isActive ? palette.accentColor : withAlpha(palette.fontColor, "70") }}>
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">{activePanel}</div>
    </div>
  );

  if (embedded) return <div className="min-w-0 h-full">{content}</div>;

  return (
    <div className="qp-panel-card mt-3" style={{ background: "rgba(255,255,255,0.05)", borderColor: palette.borderColor }}>
      {content}
    </div>
  );
}
