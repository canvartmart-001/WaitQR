import { useRef, useState } from "react";
import { ImageIcon, Monitor, Pencil, Plus, Search, Trash2, Upload, UserRound, X } from "lucide-react";
import { assignedMembersForService, memberCanBeAssignedToService } from "../../../lib/assignments";

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

function serviceInitial(name) {
  return String(name || "S").trim().charAt(0).toUpperCase() || "S";
}

function desksForAssignedMembers(assignedMembers, desks) {
  const deskById = new Map((Array.isArray(desks) ? desks : []).map((desk) => [String(desk.id), desk]));
  const assignedDeskIds = new Set();

  assignedMembers.forEach((member) => {
    (Array.isArray(member.deskIds) ? member.deskIds : []).forEach((deskId) => {
      if (deskById.has(String(deskId))) assignedDeskIds.add(String(deskId));
    });
  });

  return Array.from(assignedDeskIds)
    .map((deskId) => deskById.get(deskId))
    .filter(Boolean);
}

function assignedDeskNamesForMember(member, desks) {
  const deskById = new Map((Array.isArray(desks) ? desks : []).map((desk) => [String(desk.id), desk.name]));
  return Array.from(
    new Map(
      (Array.isArray(member?.deskIds) ? member.deskIds : [])
        .map((deskId) => [String(deskId), deskById.get(String(deskId))])
        .filter(([, name]) => Boolean(name))
    ).values()
  );
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

function TextArea({ value, onChange, placeholder, theme }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={3}
      {...focusHandlers(theme)}
      className="w-full resize-none border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
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

function ServiceForm({ labels, services, theme, editingService, isSaving, onCancel, onSave }) {
  const inputRef = useRef(null);
  const [name, setName] = useState(() => editingService?.name || "");
  const [description, setDescription] = useState(() => editingService?.description || "");
  const [image, setImage] = useState(() => editingService?.image || null);
  const [status, setStatus] = useState(() => editingService?.status || "Available");
  const [submitError, setSubmitError] = useState("");
  const duplicateName = services.some((service) => service.id !== editingService?.id && service.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameError = !name.trim() ? `${labels.serviceWord} name is required.` : duplicateName ? `This ${labels.serviceWordLower} already exists.` : "";
  const canSave = name.trim() && !duplicateName;

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => setImage(readerEvent.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!canSave) return;

    const result = onSave({ name: name.trim(), description: description.trim(), image, status });
    if (result?.ok === false) {
      setSubmitError(
        result.error === "duplicate-name"
          ? `This ${labels.serviceWordLower} already exists.`
          : `Enter a ${labels.serviceWordLower} name before saving.`
      );
    }
  };

  return (
    <div className="border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold" style={{ color: theme.fontColor }}>
          {editingService ? `Edit ${labels.serviceWordLower}` : `Add ${labels.serviceWordLower}`}
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
          <div className="relative shrink-0">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border"
              style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}
            >
              {image ? (
                <img src={image} alt={`${labels.serviceWord} preview`} className="h-full w-full object-cover" />
              ) : name.trim() ? (
                <span className="text-base font-semibold" style={{ color: theme.accentColor }}>
                  {serviceInitial(name || editingService?.name)}
                </span>
              ) : (
                <ImageIcon size={24} style={{ color: withAlpha(theme.fontColor, "80") }} />
              )}
            </div>
            <button
              type="button"
              onClick={() => (image ? setImage(null) : inputRef.current?.click())}
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors hover:bg-white/10"
              style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
              aria-label={image ? "Remove service image" : "Upload service image"}
              title={image ? "Remove image" : "Upload image"}
            >
              {image ? <X size={12} /> : <Upload size={12} />}
            </button>
            <input ref={inputRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium" style={{ color: theme.fontColor }}>
              {name.trim() || labels.serviceWord}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-sm font-medium" style={{ color: status === "Available" ? theme.fontColor : withAlpha(theme.fontColor, "80") }}>
            {status}
          </span>
          <Toggle checked={status === "Available"} onChange={(checked) => setStatus(checked ? "Available" : "Unavailable")} accent={theme.accentColor} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]" style={{ borderTop: `1px solid ${withAlpha(theme.borderColor, "40")}` }}>
        <FormField label={`${labels.serviceWord} Name`} error={nameError} theme={theme}>
          <TextInput value={name} onChange={setName} placeholder={`e.g. Billing ${labels.serviceWordLower}`} theme={theme} />
        </FormField>
        <FormField label={`${labels.serviceWord} Description`} theme={theme}>
          <TextArea value={description} onChange={setDescription} placeholder={`Short info about this ${labels.serviceWordLower}`} theme={theme} />
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
          {isSaving ? "Saving..." : editingService ? "Save changes" : `Add ${labels.serviceWordLower}`}
        </button>
      </div>
    </div>
  );
}

function CountChip({ icon: Icon, count, label, tooltip, tooltipItems, tone = "neutral", theme }) {
  const warning = tone === "warning";

  return (
    <span
      className="group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: warning ? "rgba(239,68,68,0.15)" : withAlpha(theme.fontColor, "12"),
        color: warning ? "#f87171" : withAlpha(theme.fontColor, "b3"),
      }}
      tabIndex={0}
      aria-label={`${count} ${label}: ${tooltip}`}
    >
      <Icon size={12} />
      {count}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-72 -translate-x-1/2 whitespace-normal rounded-md border px-3 py-2 text-xs font-normal leading-relaxed shadow-xl group-hover:block group-focus:block"
        style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
      >
        <span className="mb-1 block font-medium" style={{ color: warning ? "#f87171" : theme.accentColor }}>
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
      </span>
    </span>
  );
}

function ServiceCard({ service, desks, members, labels, theme, onEdit, onDelete }) {
  const assignedMembers = assignedMembersForService(members, service.id);
  const assignedDesks = desksForAssignedMembers(assignedMembers, desks);
  const memberCountLabel = assignedMembers.length === 1 ? labels.memberWordLower : labels.memberWordPluralLower;
  const memberTooltip = assignedMembers.length
    ? assignedMembers.map((member) => member.name).join(", ")
    : `No ${labels.memberWordPluralLower} assigned`;
  const memberTooltipItems = assignedMembers.map((member) => member.name);
  const counterWord = "counter";
  const counterWordPlural = "counters";
  const counterTooltipTitle = assignedDesks.length
    ? `${assignedDesks.length} ${assignedDesks.length === 1 ? counterWord : counterWordPlural} assigned`
    : assignedMembers.length
      ? "No counter connected"
      : `No ${labels.memberWordLower} assigned`;
  const deskTooltip = assignedDesks.length
    ? assignedDesks.map((desk) => desk.name).join(", ")
    : assignedMembers.length === 1
      ? `Assigned ${labels.memberWordLower} is not assigned to any ${counterWord}.`
      : assignedMembers.length > 1
        ? `Assigned ${labels.memberWordPluralLower} are not assigned to any ${counterWord}.`
        : `No ${labels.memberWordLower} assigned to serve this ${labels.serviceWordLower}.`;
  const deskTooltipItems = assignedDesks.map((desk) => desk.name);
  const isDefault = Boolean(service.isDefault);
  const available = service.status !== "Unavailable";
  const statusColor = available ? "#22c55e" : "#ef4444";
  const hasAssignedDesks = assignedDesks.length > 0;

  return (
    <div className="flex flex-col gap-3 border p-4 lg:flex-row lg:items-center" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.2 }}>
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border"
          style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}
        >
          {service.image ? (
            <img src={service.image} alt={service.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold" style={{ color: theme.accentColor }}>
              {serviceInitial(service.name)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium" style={{ color: theme.fontColor }}>
              {service.name}
            </p>
            {isDefault ? (
              <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: withAlpha(theme.accentColor, "1f"), color: theme.accentColor }}>
                Default
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-col items-start gap-1 text-xs font-medium">
            {assignedMembers.length ? (
              assignedMembers.map((member) => {
                const assignedDeskNames = assignedDeskNamesForMember(member, desks);
                const tooltip = assignedDeskNames.length ? assignedDeskNames.join(", ") : "No desk assigned";
                const textColor = assignedDeskNames.length ? theme.accentColor : withAlpha(theme.fontColor, "80");

                return (
                  <span
                    key={member.id}
                    aria-label={`${member.name}: ${tooltip}`}
                    className="group relative inline-flex cursor-help"
                    tabIndex={0}
                    style={{ color: textColor }}
                  >
                    {member.name}
                    <span
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-64 -translate-x-1/2 whitespace-normal rounded-md border px-3 py-2 text-xs font-normal leading-relaxed shadow-xl group-hover:block group-focus:block"
                      style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
                    >
                      <span className="block font-medium" style={{ color: theme.fontColor }}>
                        {member.name}
                      </span>
                      <span className="mt-1 block" style={{ color: textColor }}>
                        {tooltip}
                      </span>
                    </span>
                  </span>
                );
              })
            ) : (
              <span style={{ color: "#f87171" }}>
                No {labels.memberWordPluralLower} assigned
              </span>
            )}
          </div>
          {service.description ? (
            <p className="mt-1 text-xs" style={{ color: withAlpha(theme.fontColor, "70") }}>
              {service.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-start gap-3 lg:justify-end">
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium" style={{ backgroundColor: available ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: statusColor }}>
          {available ? "Available" : "Unavailable"}
        </span>
        <CountChip icon={UserRound} count={assignedMembers.length} label={memberCountLabel} tooltip={memberTooltip} tooltipItems={memberTooltipItems} tone={assignedMembers.length === 0 ? "warning" : "neutral"} theme={theme} />
        <span
          className="group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: hasAssignedDesks ? withAlpha(theme.fontColor, "12") : "rgba(239,68,68,0.15)",
            color: hasAssignedDesks ? withAlpha(theme.fontColor, "b3") : "#f87171",
          }}
          tabIndex={0}
          aria-label={`${assignedDesks.length} ${counterWordPlural} assigned: ${deskTooltip}`}
        >
          <Monitor size={12} />
          {assignedDesks.length}
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-72 -translate-x-1/2 whitespace-normal rounded-md border px-3 py-2 text-xs font-normal leading-relaxed shadow-xl group-hover:block group-focus:block"
            style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
          >
            <span className="mb-1 block font-medium" style={{ color: hasAssignedDesks ? theme.accentColor : "#f87171" }}>
              {counterTooltipTitle}
            </span>
            {deskTooltipItems.length ? (
              <span className="block space-y-1">
                {deskTooltipItems.map((deskName) => (
                  <span key={deskName} className="block">
                    {deskName}
                  </span>
                ))}
              </span>
            ) : (
              <span>{deskTooltip}</span>
            )}
          </span>
        </span>
        <button type="button" onClick={onEdit} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5" style={{ color: withAlpha(theme.fontColor, "99") }} aria-label={`Edit ${labels.serviceWordLower}`}>
          <Pencil size={14} />
        </button>
        <button type="button" onClick={onDelete} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5" style={{ color: "#f87171" }} aria-label={`Remove ${labels.serviceWordLower}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export function AdminServicesPage({
  services,
  desks = [],
  members,
  labels,
  askConfirm,
  serviceActions,
  manageUi,
  theme,
  settingsSaving = false,
  settingsSaveError = "",
}) {
  const { addServiceWithAssignments, renameService, updateService, removeService } = serviceActions;
  const { editingService, setEditingService, showAddService, setShowAddService } = manageUi.services;
  const [query, setQuery] = useState("");
  const editingServiceRecord = editingService ? services.find((service) => service.id === editingService) : null;
  const showForm = showAddService || Boolean(editingServiceRecord);
  const formTheme = { ...theme, bgColor: theme.bgColor || "#04060b" };
  const assignableMembers = members.filter(memberCanBeAssignedToService);

  const filtered = services.filter((service) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const memberNames = assignedMembersForService(assignableMembers, service.id).map((member) => member.name);
    return [service.name, service.id, service.description, ...memberNames].some((value) => String(value || "").toLowerCase().includes(q));
  });

  const closeForm = () => {
    setShowAddService(false);
    setEditingService(null);
  };

  const saveForm = ({ name, description, image, status }) => {
    const duplicateName = services.some((service) => service.id !== editingServiceRecord?.id && service.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) return { ok: false, error: "duplicate-name" };

    if (editingServiceRecord) {
      updateService?.(editingServiceRecord.id, { name, description, image: image || null, status });
      if (!updateService) renameService(editingServiceRecord.id, name);
      closeForm();
      return { ok: true };
    }

    const result = addServiceWithAssignments(name, [], { description, image: image || null, status });
    if (result.ok) closeForm();
    return result;
  };

  return (
    <div style={{ "--field-bg": "rgba(255,255,255,0.04)" }}>
      <main className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
        {showForm ? (
          <ServiceForm
            key={editingServiceRecord ? `edit-${editingServiceRecord.id}` : "add"}
            labels={labels}
            services={services}
            theme={formTheme}
            editingService={editingServiceRecord}
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
                placeholder={`Search ${labels.serviceWordPluralLower}`}
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
                  setEditingService(null);
                  setShowAddService(true);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
              >
                <Plus size={15} />
                Add {labels.serviceWordLower}
              </button>
            ) : null}
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
                No {labels.serviceWordPluralLower} match your search.
              </p>
            ) : null}
            {filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                desks={desks}
                members={assignableMembers}
                labels={labels}
                theme={formTheme}
                onEdit={() => {
                  setEditingService(service.id);
                  setShowAddService(false);
                }}
                onDelete={() =>
                  askConfirm(
                    `Remove this ${labels.serviceWordLower}?`,
                    `"${service.name}" will be removed from every ${labels.memberWordLower}.`,
                    () => {
                      removeService(service.id);
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
