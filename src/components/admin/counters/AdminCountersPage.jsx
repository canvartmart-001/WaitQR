import { useState } from "react";
import { ChevronRight, ExternalLink, Layers3, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { assignedMembersForDesk, memberCanBeAssignedToDesk, memberCanBeAssignedToService, memberHasService } from "../../../lib/assignments";

const COUNTER_WORD = "Counter";
const COUNTER_WORD_LOWER = "counter";
const COUNTER_WORD_PLURAL_LOWER = "counters";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function fieldStyle(theme) {
  return {
    color: theme.fontColor,
    borderColor: theme.borderColor,
    borderRadius: theme.radius,
    backgroundColor: "var(--field-bg)",
  };
}

function focusHandlers(theme) {
  return {
    onFocus: (event) => {
      event.target.style.borderColor = theme.accentColor;
      event.target.style.boxShadow = `0 0 0 3px ${withAlpha(theme.accentColor, "33")}`;
    },
    onBlur: (event) => {
      event.target.style.borderColor = theme.borderColor;
      event.target.style.boxShadow = "";
    },
  };
}

function statusLabel(status) {
  return status === "Unavailable" ? "Closed" : "Open";
}

function FormField({ label, error, children, theme }) {
  return (
    <div className="py-2">
      <label className="mb-1.5 block text-sm font-medium" style={{ color: theme.fontColor }}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, theme }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      {...focusHandlers(theme)}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
      style={fieldStyle(theme)}
    />
  );
}

function Toggle({ checked, onChange, accent }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200"
      style={{ backgroundColor: checked ? accent : "rgba(148, 163, 184, 0.35)" }}
      aria-pressed={checked}
    >
      <span
        className="absolute h-5 w-5 rounded-full bg-white transition-transform duration-200"
        style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

function CounterForm({ desks, theme, editingDesk, isSaving, onCancel, onSave }) {
  const [name, setName] = useState(() => editingDesk?.name || "");
  const [status, setStatus] = useState(() => editingDesk?.status || "Available");
  const [submitError, setSubmitError] = useState("");
  const duplicateName = desks.some((desk) => desk.id !== editingDesk?.id && desk.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameError = !name.trim() ? `${COUNTER_WORD} name is required.` : duplicateName ? `This ${COUNTER_WORD_LOWER} already exists.` : "";
  const canSave = name.trim() && !duplicateName;
  const counterNumber = editingDesk ? Math.max(1, desks.findIndex((desk) => desk.id === editingDesk.id) + 1) : desks.length + 1;

  const handleSave = () => {
    if (!canSave) return;

    const result = onSave({ name: name.trim(), status });
    if (result?.ok === false) {
      setSubmitError(
        result.error === "duplicate-name"
          ? `This ${COUNTER_WORD_LOWER} already exists.`
          : `Enter a ${COUNTER_WORD_LOWER} name before saving.`
      );
    }
  };

  return (
    <div className="border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold" style={{ color: theme.fontColor }}>
          {editingDesk ? `Edit ${COUNTER_WORD_LOWER}` : `Add ${COUNTER_WORD_LOWER}`}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{ color: withAlpha(theme.fontColor, "99") }}
          aria-label="Close form"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}
          >
            <span className="text-sm font-semibold" style={{ color: theme.accentColor }}>
              {counterNumber}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: theme.fontColor }}>
              {name.trim() || COUNTER_WORD}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-sm font-medium" style={{ color: status === "Available" ? theme.fontColor : withAlpha(theme.fontColor, "80") }}>
            {statusLabel(status)}
          </span>
          <Toggle checked={status === "Available"} onChange={(checked) => setStatus(checked ? "Available" : "Unavailable")} accent={theme.accentColor} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6" style={{ borderTop: `1px solid ${withAlpha(theme.borderColor, "40")}` }}>
        <FormField label={`${COUNTER_WORD} Name`} error={nameError} theme={theme}>
          <TextInput value={name} onChange={setName} placeholder={`e.g. ${COUNTER_WORD} 2`} theme={theme} />
        </FormField>
      </div>

      <div
        className="mt-2 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end"
        style={{ borderTop: `1px solid ${withAlpha(theme.borderColor, "40")}`, paddingTop: "1rem" }}
      >
        {submitError ? (
          <div className="text-xs sm:mr-auto" style={{ color: "#f87171" }}>
            {submitError}
          </div>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="border px-4 py-2 text-sm transition-colors hover:bg-white/5"
          style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave || isSaving}
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
        >
          {isSaving ? "Saving..." : editingDesk ? "Save changes" : `Add ${COUNTER_WORD_LOWER}`}
        </button>
      </div>
    </div>
  );
}

function CountChip({ icon: Icon, count, label, tooltip, tooltipItems, tooltipSections, tone = "neutral", theme }) {
  const titleText = Array.isArray(tooltipSections) && tooltipSections.length
    ? tooltipSections
        .map((section) => [section.label, ...(section.items || [])].filter(Boolean).join(": "))
        .join("; ")
    : tooltip;
  const warning = tone === "warning";

  return (
    <span
      className="group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: warning ? "rgba(239,68,68,0.15)" : withAlpha(theme.fontColor, "12"),
        color: warning ? "#f87171" : withAlpha(theme.fontColor, "b3"),
      }}
      tabIndex={0}
      aria-label={`${count} ${label}: ${titleText}`}
    >
      <Icon size={12} />
      {count}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-72 -translate-x-1/2 whitespace-normal rounded-md border px-3 py-2 text-xs font-normal leading-relaxed shadow-xl group-hover:block group-focus:block"
        style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
      >
        {Array.isArray(tooltipSections) && tooltipSections.length ? (
          <span className="block space-y-2">
            {tooltipSections.map((section) => (
              <span key={section.label} className="block">
                <span className="block font-medium" style={{ color: theme.accentColor }}>
                  {section.label}
                </span>
                {section.items.length ? (
                  <span className="mt-1 block space-y-1">
                    {section.items.map((item) => (
                      <span key={item} className="block">
                        {item}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="mt-1 block" style={{ color: withAlpha(theme.fontColor, "99") }}>
                    {section.emptyLabel}
                  </span>
                )}
              </span>
            ))}
          </span>
        ) : (
          <>
            <span className="mb-1 block font-medium" style={{ color: theme.accentColor }}>
              {count} {label}
            </span>
            {Array.isArray(tooltipItems) && tooltipItems.length ? (
              <span className="block space-y-1">
                {tooltipItems.map((item) => (
                  <span key={item} className="block">
                    {item}
                  </span>
                ))}
              </span>
            ) : (
              <span>{tooltip}</span>
            )}
          </>
        )}
      </span>
    </span>
  );
}

function CounterCard({ desk, index, services, members, labels, theme, getDeskPath, onEdit, onDelete }) {
  const assignedMembers = assignedMembersForDesk(members, desk.id);
  const serviceMembers = assignedMembers.filter(memberCanBeAssignedToService);
  const assignedServices = services.filter((service) => serviceMembers.some((member) => memberHasService(member, service.id)));
  const receptionistMembers = assignedMembers.filter((member) => (member.role || "Member") === "Receptionist");
  const isDefault = Boolean(desk.isDefault);
  const memberLabel = serviceMembers.length ? serviceMembers.map((member) => member.name).join(", ") : `No ${labels.memberWordPluralLower} assigned`;
  const memberTooltipItems = serviceMembers.map((member) => member.name);
  const serviceCoverageLabel = assignedServices.length
    ? assignedServices
        .map((service) => {
          const memberCount = serviceMembers.filter((member) => memberHasService(member, service.id)).length;
          return `${memberCount} ${service.name}`;
        })
        .join(", ")
    : `No ${labels.serviceWordPluralLower} covered`;
  const serviceCoverageItems = assignedServices.map((service) => {
    const memberCount = serviceMembers.filter((member) => memberHasService(member, service.id)).length;
    return `${memberCount} ${service.name}`;
  });
  const serviceCountLabel = assignedServices.length === 1 ? labels.serviceWordLower : labels.serviceWordPluralLower;
  const memberCountLabel = serviceMembers.length === 1 ? labels.memberWordLower : labels.memberWordPluralLower;
  const memberServiceRows = serviceMembers.length
    ? serviceMembers.map((member) => {
        const memberServices = assignedServices.filter((service) => memberHasService(member, service.id));
        return {
          id: member.id,
          name: member.name,
          serviceLabel: memberServices.length ? memberServices.map((service) => service.name).join(", ") : `No ${labels.serviceWordPluralLower} assigned`,
          hasService: memberServices.length > 0,
          hasMember: true,
        };
      })
    : [
        {
          id: "unassigned",
          name: `No ${labels.memberWordLower} assigned`,
          serviceLabel: "",
          hasService: false,
          hasMember: false,
        },
      ];
  const available = desk.status !== "Unavailable";
  const statusColor = available ? "#22c55e" : "#ef4444";

  return (
    <div className="flex flex-col gap-3 border p-4 lg:flex-row lg:items-center" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.2 }}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
          style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}
        >
          <span className="text-sm font-semibold" style={{ color: theme.accentColor }}>
            {index + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2">
            <a
              href={getDeskPath(desk)}
              className="inline-flex min-w-0 items-center gap-1.5 rounded-sm text-sm font-medium leading-none transition-colors hover:opacity-80"
              style={{ color: theme.fontColor }}
              aria-label={`Open ${COUNTER_WORD_LOWER}`}
            >
              <span className="min-w-0 truncate leading-none">
                {desk.name}
              </span>
              <span className="inline-flex h-[1em] w-[1em] shrink-0 -translate-y-px items-center justify-center">
                <ExternalLink size={13} style={{ color: withAlpha(theme.fontColor, "99") }} />
              </span>
            </a>
            {isDefault ? (
              <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: withAlpha(theme.accentColor, "1f"), color: theme.accentColor }}>
                Default
              </span>
            ) : null}
          </div>
          <div className="mt-1.5 space-y-1">
            {receptionistMembers.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: withAlpha(theme.fontColor, "80") }}>
                  {member.name}
                  <ChevronRight size={13} className="shrink-0" style={{ color: withAlpha(theme.fontColor, "55") }} />
                </span>
                <span className="min-w-0 break-words" style={{ color: withAlpha(theme.fontColor, "80") }}>
                  Receptionist
                </span>
              </div>
            ))}
            {memberServiceRows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: row.hasMember ? theme.accentColor : "#f87171" }}>
                  {row.name}
                  {row.serviceLabel ? <ChevronRight size={13} className="shrink-0" style={{ color: withAlpha(theme.fontColor, "55") }} /> : null}
                </span>
                {row.serviceLabel ? (
                  <span className="min-w-0 break-words" style={{ color: row.hasService ? theme.fontColor : "#f87171" }}>
                    {row.serviceLabel}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-start gap-3 lg:justify-end">
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: available ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: statusColor }}>
          {available ? "Open" : "Closed"}
        </span>
        <CountChip icon={UserRound} count={serviceMembers.length} label={memberCountLabel} tooltip={memberLabel} tooltipItems={memberTooltipItems} tone={serviceMembers.length === 0 ? "warning" : "neutral"} theme={theme} />
        <CountChip icon={Layers3} count={assignedServices.length} label={serviceCountLabel} tooltip={serviceCoverageLabel} tooltipItems={serviceCoverageItems} theme={theme} />
        <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5" style={{ color: withAlpha(theme.fontColor, "99") }} aria-label={`Edit ${COUNTER_WORD_LOWER}`}>
          <Pencil size={14} />
        </button>
        <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5" style={{ color: "#f87171" }} aria-label={`Remove ${COUNTER_WORD_LOWER}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function AdminCountersPage({
  desks,
  services,
  members,
  labels,
  askConfirm,
  getDeskPath,
  deskActions,
  manageUi,
  theme,
  settingsSaving = false,
  settingsSaveError = "",
}) {
  const { addDeskWithAssignments, renameDesk, updateDesk, removeDesk } = deskActions;
  const { editingDesk, setEditingDesk, showAddDesk, setShowAddDesk } = manageUi.desks;
  const [query, setQuery] = useState("");
  const editingDeskRecord = editingDesk ? desks.find((desk) => desk.id === editingDesk) : null;
  const showForm = showAddDesk || Boolean(editingDeskRecord);
  const formTheme = { ...theme, bgColor: theme.bgColor || "#04060b" };
  const assignableMembers = members.filter(memberCanBeAssignedToDesk);

  const filtered = desks.filter((desk) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const deskMembers = assignedMembersForDesk(assignableMembers, desk.id);
    const serviceMemberIds = new Set(deskMembers.filter(memberCanBeAssignedToService).flatMap((member) => member.serviceIds || []).map(String));
    const serviceNames = services.filter((service) => serviceMemberIds.has(String(service.id))).map((service) => service.name);
    const memberNames = deskMembers.map((member) => member.name);
    return [desk.name, desk.id, ...serviceNames, ...memberNames].some((value) => String(value || "").toLowerCase().includes(q));
  });

  const closeForm = () => {
    setShowAddDesk(false);
    setEditingDesk(null);
  };

  const saveForm = ({ name, status }) => {
    const duplicateName = desks.some((desk) => desk.id !== editingDeskRecord?.id && desk.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) return { ok: false, error: "duplicate-name" };

    if (editingDeskRecord) {
      updateDesk?.(editingDeskRecord.id, { name, status });
      if (!updateDesk) renameDesk(editingDeskRecord.id, name);
      closeForm();
      return { ok: true };
    }

    const result = addDeskWithAssignments(name, [], { status });
    if (result.ok) closeForm();
    return result;
  };

  return (
    <div style={{ "--field-bg": "rgba(255,255,255,0.04)" }}>
      <main className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
        {showForm ? (
          <CounterForm
            key={editingDeskRecord ? `edit-${editingDeskRecord.id}` : "add"}
            desks={desks}
            theme={formTheme}
            editingDesk={editingDeskRecord}
            isSaving={settingsSaving}
            onCancel={closeForm}
            onSave={saveForm}
          />
        ) : null}

        <div className="border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xs">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${COUNTER_WORD_PLURAL_LOWER}`}
                {...focusHandlers(theme)}
                style={fieldStyle(theme)}
                className="w-full border py-2 pl-9 pr-3 text-sm outline-none transition-colors"
              />
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(theme.fontColor, "80") }} />
            </div>
            {(settingsSaving || settingsSaveError) ? (
              <div className="text-xs" style={{ color: settingsSaveError ? "#f87171" : withAlpha(theme.fontColor, "80") }}>
                {settingsSaveError || "Saving changes..."}
              </div>
            ) : null}
            {!showForm ? (
              <button
                type="button"
                disabled={settingsSaving}
                onClick={() => {
                  setEditingDesk(null);
                  setShowAddDesk(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
              >
                <Plus size={15} />
                Add {COUNTER_WORD_LOWER}
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
                No {COUNTER_WORD_PLURAL_LOWER} match your search.
              </p>
            ) : null}
            {filtered.map((desk) => (
              <CounterCard
                key={desk.id}
                desk={desk}
                index={desks.findIndex((item) => item.id === desk.id)}
                services={services}
                members={assignableMembers}
                labels={labels}
                theme={formTheme}
                getDeskPath={getDeskPath}
                onEdit={() => {
                  setEditingDesk(desk.id);
                  setShowAddDesk(false);
                }}
                onDelete={() =>
                  askConfirm(
                    `Remove this ${COUNTER_WORD_LOWER}?`,
                    `"${desk.name}" will be removed and any active ticket will return to the queue.`,
                    () => {
                      removeDesk(desk.id);
                      closeForm();
                    },
                  )
                }
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
