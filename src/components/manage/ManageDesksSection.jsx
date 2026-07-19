import { Link2, Pencil, Plus, Trash2, User } from "lucide-react";
import { C } from "../../lib/theme";

export function ManageDesksSection({
  desks,
  services,
  members,
  labels,
  editingDeskLabel,
  setEditingDeskLabel,
  showAddDesk,
  setShowAddDesk,
  newDeskName,
  setNewDeskName,
  newDeskServiceIds,
  setNewDeskServiceIds,
  newDeskServiceError,
  setNewDeskServiceError,
  toggleNewDeskService,
  editingDesk,
  setEditingDesk,
  addDesk,
  removeDesk,
  renameDesk,
  toggleDeskService,
  askConfirm,
  getDeskPath,
}) {
  const { deskLabel, setDeskLabel, deskWord, deskWordLower, deskWordPlural, deskWordPluralLower, serviceWordLower, serviceWordPluralLower } = labels;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        {editingDeskLabel ? (
          <input
            autoFocus
            value={deskLabel}
            onChange={(e) => setDeskLabel(e.target.value)}
            onBlur={() => setEditingDeskLabel(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setEditingDeskLabel(false);
            }}
            placeholder="Desk"
            className="qp-focusable text-sm font-semibold rounded-md px-2 py-1 outline-none"
            style={{ background: C.ink900, border: `1px solid ${C.ink600}`, color: C.textLight }}
          />
        ) : (
          <h3 className="text-sm font-semibold" style={{ color: C.textLight }}>
            {deskWordPlural}
          </h3>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setEditingDeskLabel(true)}
            title={`Rename "${deskWord}" label`}
            className="qp-focusable p-1.5 rounded-md border"
            style={{ borderColor: C.ink600, color: C.textFaint }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => {
              setShowAddDesk((v) => {
                const next = !v;
                if (next) {
                  setNewDeskServiceIds(services.length === 1 ? [services[0].id] : []);
                  setNewDeskServiceError("");
                }
                return next;
              });
            }}
            title={`Add ${deskWordLower}`}
            className="qp-focusable p-1.5 rounded-md border"
            style={{ borderColor: showAddDesk ? C.amber : C.ink600, color: showAddDesk ? C.amber : C.textFaint }}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
      {showAddDesk && (
        <div className="rounded-lg border p-3 mb-3" style={{ borderColor: C.amber, background: C.ink900 }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-xs font-semibold" style={{ color: C.textLight }}>
              New {deskWordLower}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddDesk(false);
                setNewDeskName("");
                setNewDeskServiceIds([]);
                setNewDeskServiceError("");
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
                {deskWord} name
              </label>
              <input
                autoFocus
                value={newDeskName}
                onChange={(e) => setNewDeskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (addDesk()) setShowAddDesk(false);
                  }
                }}
                placeholder={`e.g. ${deskWord} 5`}
                className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
              />
              </div>

              {newDeskServiceError && (
                <div className="rounded-md border px-2.5 py-2 text-[11px]" style={{ borderColor: C.coral, color: C.coral, background: "rgba(226,97,79,0.08)" }}>
                  {newDeskServiceError}
                </div>
              )}

              <div className="mt-auto flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (addDesk()) setShowAddDesk(false);
                  }}
                  className="qp-focusable flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md shrink-0"
                  style={{ background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}` }}
                >
                  <Plus size={13} /> Add {deskWordLower}
                </button>
              </div>
            </div>

            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>
                Available {serviceWordPluralLower}
              </div>
              <div className="qp-scroll flex max-h-[190px] flex-col gap-1.5 overflow-y-auto rounded-md border p-2" style={{ borderColor: C.ink700, background: C.ink800 }}>
                {services.length === 0 && (
                  <span className="text-xs" style={{ color: C.textFaint }}>
                    No {serviceWordPluralLower} defined yet
                  </span>
                )}
                {services.map((s) => {
                  const active = newDeskServiceIds.includes(s.id);
                  const assignedDesks = desks.filter((desk) => desk.services.includes(s.id));
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleNewDeskService(s.id)}
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
                            {s.name}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {assignedDesks.length === 0 ? (
                              <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.ink700, color: C.textFaint }}>
                                No {deskWordPluralLower}
                              </span>
                            ) : assignedDesks.map((desk) => (
                              <span key={desk.id} className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.ink700, color: C.textFaint }}>
                                {desk.name}
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
              {newDeskServiceIds.length === 0 && services.length > 0 && (
                <div className="text-[10px] mt-1.5" style={{ color: C.textFaint }}>
                  Select any {serviceWordPluralLower} this {deskWordLower} should cover, or leave it unassigned.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {desks.map((d) => {
          const isEditing = editingDesk === d.id;
          const assignedMembers = members.filter((m) => (Array.isArray(m.deskIds) ? m.deskIds : []).map(String).includes(String(d.id)));
          return (
            <div key={d.id} className="rounded-lg border p-3" style={{ borderColor: isEditing ? C.amber : C.ink700, background: C.ink900 }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: C.textLight }}>
                    {d.name}
                  </div>
                  {assignedMembers.length > 0 && (
                    <div className="flex items-center gap-1 text-[11px] mt-0.5 qp-mono truncate" style={{ color: C.textFaint }}>
                      <User size={11} />
                      {assignedMembers.map((m) => m.name).join(", ")}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] mt-0.5 qp-mono" style={{ color: C.textFaint }}>
                    <Link2 size={11} />
                    {getDeskPath ? getDeskPath(d) : "/"}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] mt-0.5 qp-mono" style={{ color: C.textFaint }}>
                    <Link2 size={11} />
                    {d.services.length === 0
                      ? `No ${serviceWordPluralLower} assigned`
                      : `${d.services.length} ${d.services.length === 1 ? serviceWordLower : serviceWordPluralLower}`}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingDesk(isEditing ? null : d.id)}
                    title={`Edit ${deskWordLower}`}
                    className="qp-focusable p-1.5 rounded-md border"
                    style={{ borderColor: isEditing ? C.amber : C.ink600, color: isEditing ? C.amber : C.textFaint }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() =>
                      askConfirm(
                        `Delete this ${deskWordLower}?`,
                        `"${d.name}" will be deleted. If it's currently serving someone, that ticket goes back to the front of the waiting queue.`,
                        () => {
                          removeDesk(d.id);
                          setEditingDesk(null);
                        },
                        { confirmLabel: "Delete", variant: "destructive" }
                      )
                    }
                    title={`Delete this ${deskWordLower}`}
                    className="qp-focusable p-1.5 rounded-md border disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ borderColor: C.ink600, color: C.coral }}
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
                        {deskWord} name
                      </label>
                      <input
                        value={d.name}
                        onChange={(e) => renameDesk(d.id, e.target.value)}
                        className="qp-focusable w-full text-sm rounded-md px-2.5 py-1.5 outline-none"
                        style={{ background: C.ink800, border: `1px solid ${C.ink600}`, color: C.textLight }}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: C.textFaint }}>
                        Available {serviceWordPluralLower}
                      </div>
                      <div className="qp-scroll flex max-h-[190px] flex-col gap-1.5 overflow-y-auto rounded-md border p-2" style={{ borderColor: C.ink700, background: C.ink800 }}>
                        {services.length === 0 && (
                          <span className="text-xs" style={{ color: C.textFaint }}>
                            No {serviceWordPluralLower} defined yet
                          </span>
                        )}
                        {services.map((s) => {
                          const active = d.services.includes(s.id);
                          const assignedDesks = desks.filter((desk) => desk.services.includes(s.id));
                          return (
                            <button
                              key={s.id}
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
                                    {s.name}
                                  </span>
                                  <span className="mt-1 flex flex-wrap gap-1">
                                    {assignedDesks.length === 0 ? (
                                      <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: C.ink700, color: C.textFaint }}>
                                        No {deskWordPluralLower}
                                      </span>
                                    ) : assignedDesks.map((desk) => (
                                      <span
                                        key={desk.id}
                                        className="rounded px-1.5 py-0.5 text-[10px]"
                                        style={
                                          desk.id === d.id
                                            ? { background: C.amberSoft, color: C.amber, border: `1px solid ${C.amber}` }
                                            : { background: C.ink700, color: C.textFaint }
                                        }
                                      >
                                        {desk.name}
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
                      {d.services.length === 0 && services.length > 0 && (
                        <div className="text-[10px] mt-1.5" style={{ color: C.textFaint }}>
                          Select at least one {serviceWordLower} for this {deskWordLower}.
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
