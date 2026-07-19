import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { C } from "../../lib/theme";

export function ManageServicesSection({
  desks,
  services,
  labels,
  editingServiceLabel,
  setEditingServiceLabel,
  showAddService,
  setShowAddService,
  newServiceName,
  setNewServiceName,
  newServiceDeskIds,
  setNewServiceDeskIds,
  newServiceDeskError,
  setNewServiceDeskError,
  toggleNewServiceDesk,
  editingService,
  setEditingService,
  addService,
  removeService,
  renameService,
  toggleDeskService,
  askConfirm,
}) {
  const { serviceLabel, setServiceLabel, serviceWord, serviceWordLower, serviceWordPlural, serviceWordPluralLower, deskWordLower, deskWordPluralLower } = labels;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        {editingServiceLabel ? (
          <input
            autoFocus
            value={serviceLabel}
            onChange={(e) => setServiceLabel(e.target.value)}
            onBlur={() => setEditingServiceLabel(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingServiceLabel(false);
            }}
            placeholder="Service"
            className="qp-focusable text-sm font-semibold rounded-md px-2 py-1 outline-none"
            style={{ background: C.ink900, border: `1px solid ${C.ink600}`, color: C.textLight }}
          />
        ) : (
          <h3 className="text-sm font-semibold" style={{ color: C.textLight }}>
            {serviceWordPlural}
          </h3>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setEditingServiceLabel(true)}
            title={`Rename "${serviceWord}" label`}
            className="qp-focusable p-1.5 rounded-md border"
            style={{ borderColor: C.ink600, color: C.textFaint }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => {
              setShowAddService((v) => {
                const next = !v;
                if (next) {
                  setNewServiceDeskIds(desks.length === 1 ? [desks[0].id] : []);
                  setNewServiceDeskError("");
                }
                return next;
              });
            }}
            title={`Add ${serviceWordLower}`}
            className="qp-focusable p-1.5 rounded-md border"
            style={{ borderColor: showAddService ? C.amber : C.ink600, color: showAddService ? C.amber : C.textFaint }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
      {showAddService && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.amber, background: C.ink900 }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold" style={{ color: C.textLight }}>
              New {serviceWordLower}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddService(false);
                setNewServiceName("");
                setNewServiceDeskIds([]);
                setNewServiceDeskError("");
              }}
              className="qp-focusable text-[11px] px-2 py-1 rounded-md border"
              style={{ borderColor: C.ink600, color: C.textFaint }}
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(220px,1fr)]">
            <div className="flex flex-col gap-3">
              <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                {serviceWord} name
              </label>
              <input
                autoFocus
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (addService()) setShowAddService(false);
                  }
                }}
                placeholder={`e.g. Loan ${serviceWordPlural}`}
                className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
              />
              </div>

              {newServiceDeskError && (
                <div className="rounded-md border px-2.5 py-2 text-[11px]" style={{ borderColor: C.coral, color: C.coral, background: "rgba(226,97,79,0.08)" }}>
                  {newServiceDeskError}
                </div>
              )}

              <div className="mt-auto flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (addService()) setShowAddService(false);
                  }}
                  className="qp-focusable flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md shrink-0"
                  style={{ background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}` }}
                >
                  <Plus size={13} /> Add {serviceWordLower}
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>
                Available {deskWordPluralLower}
              </div>
              <div className="qp-scroll flex max-h-[190px] flex-col gap-1.5 overflow-y-auto rounded-md border p-2" style={{ borderColor: C.ink700, background: C.ink800 }}>
                {desks.length === 0 && (
                  <span className="text-xs" style={{ color: C.textFaint }}>
                    No {deskWordPluralLower} defined yet
                  </span>
                )}
                {desks.map((d) => {
                  const active = newServiceDeskIds.map(String).includes(String(d.id));
                  const assignedServices = services.filter((service) => d.services.includes(service.id));
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleNewServiceDesk(d.id)}
                      className="qp-focusable w-full rounded-md border px-2 py-2 text-left"
                      style={
                        active
                          ? { background: C.amberSoft, borderColor: C.amber, color: C.amber }
                          : { background: "transparent", borderColor: C.ink600, color: C.textFaint }
                      }
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium" style={{ color: active ? C.amber : C.textLight }}>
                            {d.name}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {assignedServices.length === 0 ? (
                              <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.ink700, color: C.textFaint }}>
                                No {serviceWordPluralLower}
                              </span>
                            ) : assignedServices.map((service) => (
                              <span key={service.id} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.ink700, color: C.textFaint }}>
                                {service.name}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-wider" style={{ color: active ? C.amber : C.textFaint }}>
                          {active ? "Selected" : "Add"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {newServiceDeskIds.length === 0 && desks.length > 0 && (
                <div className="text-[10px] mt-1.5" style={{ color: C.textFaint }}>
                  Select any {deskWordPluralLower} this {serviceWordLower} should use, or leave it unassigned.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {services.length === 0 && (
          <div className="text-xs py-2" style={{ color: C.textFaint }}>
            No {serviceWordPluralLower} yet. Add one above.
          </div>
        )}
        {services.map((s) => {
          const isEditing = editingService === s.id;
          const handlingDesks = desks.filter((d) => d.services.includes(s.id));
          return (
            <div key={s.id} className="rounded-lg border p-3" style={{ borderColor: isEditing ? C.amber : C.ink700, background: C.ink900 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: C.textLight }}>
                    {s.name}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5 qp-mono" style={{ color: C.textFaint }}>
                    <Link2 size={11} />
                    {handlingDesks.length} {handlingDesks.length === 1 ? deskWordLower : deskWordPluralLower}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingService(isEditing ? null : s.id)}
                    title={`Edit ${serviceWordLower}`}
                    className="qp-focusable p-1.5 rounded-md border"
                    style={{ borderColor: isEditing ? C.amber : C.ink600, color: isEditing ? C.amber : C.textFaint }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() =>
                      askConfirm(
                        `Delete this ${serviceWordLower}?`,
                        `"${s.name}" will be removed and unassigned from every ${deskWordLower}. Existing tickets that reference it will just show as "General" going forward.`,
                        () => {
                          removeService(s.id);
                          setEditingService(null);
                        }
                      )
                    }
                    title={`Delete this ${serviceWordLower}`}
                    className="qp-focusable p-1.5 rounded-md border disabled:cursor-not-allowed"
                    style={{ borderColor: C.ink600, color: C.coral, opacity: 1 }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {isEditing && (
                <div className="mt-3 border-t pt-3" style={{ borderColor: C.ink700 }}>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,0.85fr)_minmax(220px,1fr)]">
                    <div>
                      <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: C.textFaint }}>
                        {serviceWord} name
                      </label>
                      <input
                        value={s.name}
                        onChange={(e) => renameService(s.id, e.target.value)}
                        className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                        style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>
                        Available {deskWordPluralLower}
                      </div>
                      <div className="qp-scroll flex max-h-[190px] flex-col gap-1.5 overflow-y-auto rounded-md border p-2" style={{ borderColor: C.ink700, background: C.ink800 }}>
                        {desks.length === 0 && (
                          <span className="text-xs" style={{ color: C.textFaint }}>
                            No {deskWordPluralLower} defined yet
                          </span>
                        )}
                        {desks.map((d) => {
                          const active = d.services.includes(s.id);
                          const assignedServices = services.filter((service) => d.services.includes(service.id));
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggleDeskService(d.id, s.id)}
                              className="qp-focusable w-full rounded-md border px-2 py-2 text-left"
                              style={
                                active
                                  ? { background: C.amberSoft, borderColor: C.amber, color: C.amber }
                                  : { background: "transparent", borderColor: C.ink600, color: C.textFaint }
                              }
                            >
                              <span className="flex items-start justify-between gap-2">
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-medium" style={{ color: active ? C.amber : C.textLight }}>
                                    {d.name}
                                  </span>
                                  <span className="mt-1 flex flex-wrap gap-1">
                                    {assignedServices.length === 0 ? (
                                      <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.ink700, color: C.textFaint }}>
                                        No {serviceWordPluralLower}
                                      </span>
                                    ) : assignedServices.map((service) => (
                                      <span
                                        key={service.id}
                                        className="rounded px-1.5 py-0.5 text-[10px]"
                                        style={
                                          service.id === s.id
                                            ? { background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}` }
                                            : { background: C.ink700, color: C.textFaint }
                                        }
                                      >
                                        {service.name}
                                      </span>
                                    ))}
                                  </span>
                                </span>
                                <span className="shrink-0 text-[10px] uppercase tracking-wider" style={{ color: active ? C.amber : C.textFaint }}>
                                  {active ? "Selected" : "Add"}
                                </span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {handlingDesks.length === 0 && desks.length > 0 && (
                        <div className="text-[10px] mt-1.5" style={{ color: C.textFaint }}>
                          Select at least one {deskWordLower} for this {serviceWordLower}.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
