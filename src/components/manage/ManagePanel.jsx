import { Settings2 } from "lucide-react";
import { C } from "../../lib/theme";
import { ManageDesksSection } from "./ManageDesksSection";
import { ManageServicesSection } from "./ManageServicesSection";
import { ManageMembersSection } from "./ManageMembersSection";

export function ManagePanel({
  showManage,
  onClose,
  manageTab,
  setManageTab,
  labels,
  desks,
  services,
  members,
  deskActions,
  serviceActions,
  memberActions,
  manageUi,
  askConfirm,
  getDeskPath,
}) {
  if (!showManage) return null;

  const { deskWordPluralLower, serviceWordPluralLower, memberWordPluralLower, deskWordPlural, serviceWordPlural, memberWordPlural } = labels;

  return (
    <div className="qp-container pt-5">
      <div className="qp-panel-card" style={{ background: C.ink800, borderColor: C.hair }}>
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-1.5 min-w-0 text-[11px] uppercase tracking-[0.14em]" style={{ color: C.textMuted }}>
            <Settings2 size={13} />
            <span className="truncate">
              Manage {deskWordPluralLower}, {serviceWordPluralLower} &amp; {memberWordPluralLower}
            </span>
          </div>
          <button onClick={onClose} className="qp-focusable shrink-0 text-xs px-2 py-1 rounded-md" style={{ color: C.textFaint }}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-4 rounded-lg p-1" style={{ background: C.ink900 }}>
          {[
            { key: "desks", label: deskWordPlural, count: desks.length },
            { key: "services", label: serviceWordPlural, count: services.length },
            { key: "members", label: memberWordPlural, count: members.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setManageTab(tab.key)}
              className="qp-focusable flex min-w-0 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium rounded-md"
              style={{
                background: manageTab === tab.key ? C.ink700 : "transparent",
                color: manageTab === tab.key ? C.textLight : C.textFaint,
              }}
            >
              <span className="truncate">{tab.label}</span>
              <span className="qp-mono text-[10px]" style={{ color: manageTab === tab.key ? C.amber : C.textFaint }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {manageTab === "desks" && (
          <ManageDesksSection
            desks={desks}
            services={services}
            members={members}
            labels={labels}
            askConfirm={askConfirm}
            getDeskPath={getDeskPath}
            {...manageUi.desks}
            {...deskActions}
          />
        )}

        {manageTab === "services" && (
          <ManageServicesSection
            desks={desks}
            services={services}
            labels={labels}
            askConfirm={askConfirm}
            {...manageUi.services}
            {...serviceActions}
            toggleDeskService={deskActions.toggleDeskService}
          />
        )}

        {manageTab === "members" && (
          <ManageMembersSection
            desks={desks}
            members={members}
            labels={labels}
            askConfirm={askConfirm}
            {...manageUi.members}
            {...memberActions}
          />
        )}
      </div>
    </div>
  );
}
