import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, ChevronDown, ChevronRight, Mail, Pencil, Phone, Plus, Search, Trash2, Upload, UserRound, X } from "lucide-react";
import { memberCanBeAssignedToDesk, memberCanBeAssignedToService, memberHasDesk, memberHasService } from "../../../lib/assignments";

const ROLES = ["Manager", "Receptionist", "Member"];
const COUNTER_WORD = "Counter";
const COUNTER_WORD_LOWER = "counter";
const COUNTER_WORD_PLURAL = "Counters";
const COUNTER_WORD_PLURAL_LOWER = "counters";
const BLANK_FORM = {
  name: "",
  employeeId: "",
  role: "Member",
  email: "",
  phone: "",
  about: "",
  status: "Active",
  photo: null,
  deskIds: [],
  serviceIds: [],
};

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MB";
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function counterDisplayName(name) {
  const text = String(name || "").trim();
  if (!text) return COUNTER_WORD;
  return text.replace(/^desk\b/i, COUNTER_WORD);
}

function brandPrefix(brandName) {
  const brand = String(brandName || "WaitQR");
  const words = brand.match(/[a-z0-9]+/gi) || ["WaitQR"];
  const initialsFromWords = words.length > 1 ? words.slice(0, 3).map((word) => word[0]).join("") : "";
  const uppercaseSignal = brand.replace(/[^A-Z0-9]/g, "");
  const singleWordPrefix = words.length === 1 && uppercaseSignal.length < 2 ? words[0].slice(0, 3) : "";
  const compact = (initialsFromWords || singleWordPrefix || uppercaseSignal || words.join("")).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return (compact.length >= 2 ? compact : "MBR").padEnd(3, "X").slice(0, 3);
}

function randomDigits(length) {
  const values = new Uint8Array(length);
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(values);
    return Array.from(values, (value) => String(value % 10)).join("");
  }

  return Array.from({ length }, () => String(Math.floor(Math.random() * 10))).join("");
}

function nextMemberId(members, brandName) {
  const prefix = brandPrefix(brandName);
  const taken = new Set(members.map((member) => String(member.id || "").toUpperCase()));
  let candidate = "";

  do {
    candidate = `${prefix}${randomDigits(8)}`;
  } while (taken.has(candidate));

  return candidate;
}

function memberToForm(member, members, brandName) {
  if (!member) return { ...BLANK_FORM, employeeId: nextMemberId(members, brandName) };
  return {
    ...BLANK_FORM,
    ...member,
    employeeId: member.id,
    role: member.role || "Member",
    email: member.email || "",
    status: member.status || "Active",
    deskIds: Array.isArray(member.deskIds) ? member.deskIds : [],
    serviceIds: Array.isArray(member.serviceIds) ? member.serviceIds : [],
  };
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

function StatusBadge({ status }) {
  const active = status !== "Inactive";
  const color = active ? "#22c55e" : "#ef4444";
  return (
    <span
      className="inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium"
      style={{ backgroundColor: active ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color }}
    >
      {active ? "Active" : "Inactive"}
    </span>
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

function FormField({ label, tooltip, error, children, theme }) {
  return (
    <div className="py-2">
      <label className="mb-1.5 flex w-fit items-center gap-1.5 text-sm font-medium" style={{ color: theme.fontColor }}>
        {label}
        {tooltip ? (
          <span className="group relative inline-flex" tabIndex={0}>
            <CircleAlert size={13} style={{ color: withAlpha(theme.fontColor, "80") }} />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-64 -translate-x-1/2 rounded-md border px-3 py-2 text-xs font-normal leading-relaxed shadow-xl group-hover:block group-focus:block"
              style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
            >
              {tooltip}
            </span>
          </span>
        ) : null}
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

function TextInput({ value, onChange, placeholder, disabled, theme, inputMode, type = "text" }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      inputMode={inputMode}
      type={type}
      {...focusHandlers(theme)}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40 disabled:opacity-60"
      style={fieldStyle(theme)}
    />
  );
}

function SelectInput({ value, onChange, options, theme }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...focusHandlers(theme)}
        className="w-full appearance-none border px-3 py-2 pr-9 text-sm outline-none transition-colors"
        style={fieldStyle(theme)}
      >
        {options.map((option) =>
          typeof option === "string" ? (
            <option key={option} value={option} style={{ color: "#0f172a" }}>
              {option}
            </option>
          ) : (
            <option key={option.value} value={option.value} style={{ color: "#0f172a" }}>
              {option.label}
            </option>
          )
        )}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: withAlpha(theme.fontColor, "80") }}
      />
    </div>
  );
}

function MultiSelectInput({ items, selectedIds, onChange, placeholder, emptyLabel, theme }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const currentIds = Array.isArray(selectedIds) ? selectedIds : [];
  const selected = new Set(currentIds.map(String));
  const selectedNames = items.filter((item) => selected.has(String(item.id))).map((item) => item.name);
  const displayValue = selectedNames.length ? selectedNames.join(", ") : placeholder;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = (id) => {
    const next = selected.has(String(id))
      ? currentIds.filter((selectedId) => String(selectedId) !== String(id))
      : [...currentIds, id];
    onChange(next);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        {...focusHandlers(theme)}
        className="flex w-full items-center justify-between gap-3 border px-3 py-2 text-left text-sm outline-none transition-colors"
        style={fieldStyle(theme)}
      >
        <span className={`min-w-0 truncate ${selectedNames.length ? "" : "opacity-40"}`}>{displayValue}</span>
        <ChevronDown size={16} className="shrink-0" style={{ color: withAlpha(theme.fontColor, "80") }} />
      </button>

      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 space-y-1 overflow-y-auto border p-1.5 shadow-xl"
          style={{ borderColor: theme.borderColor, backgroundColor: theme.bgColor, borderRadius: theme.radius }}
        >
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
              {emptyLabel}
            </div>
          ) : null}
          {items.map((item) => {
            const active = selected.has(String(item.id));

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5"
                style={{
                  borderRadius: Math.max(6, theme.radius - 2),
                  color: theme.fontColor,
                  backgroundColor: active ? withAlpha(theme.accentColor, "1f") : "transparent",
                }}
              >
                <span className="min-w-0 truncate">{item.name}</span>
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
                  style={{
                    borderColor: active ? theme.accentColor : withAlpha(theme.fontColor, "40"),
                    backgroundColor: active ? theme.accentColor : "transparent",
                    color: "#fff",
                  }}
                >
                  {active ? <Check size={12} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function MemberForm({ members, desks, services, labels, theme, brandName, editing, onCancel, onSave }) {
  const [form, setForm] = useState(() => memberToForm(editing, members, brandName));
  const [submitError, setSubmitError] = useState("");
  const inputRef = useRef(null);
  const set = (key) => (value) => setForm((current) => ({ ...current, [key]: value }));
  const canAssignServices = memberCanBeAssignedToService(form);
  const canAssignDesks = memberCanBeAssignedToDesk(form);
  const memberId = form.employeeId.trim();
  const duplicateId = members.some((member) => String(member.id).toLowerCase() === memberId.toLowerCase() && member.id !== editing?.id);
  const idError = !memberId
    ? "Employee ID is required."
    : !/^[A-Z0-9]{3,24}$/.test(memberId)
      ? "Employee ID must be 3-24 uppercase letters or numbers."
      : duplicateId
        ? "This Employee ID is already in use."
        : "";
  const canSave = form.name.trim() && form.phone.trim() && !idError;

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (readerEvent) => set("photo")(readerEvent.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!canSave) return;
    const result = onSave({
      ...form,
      employeeId: memberId,
      deskIds: canAssignDesks ? form.deskIds : [],
      serviceIds: canAssignServices ? form.serviceIds : [],
    });
    if (result?.ok === false) {
      setSubmitError(
        result.error === "duplicate-phone"
          ? "This phone number is already in use by another member."
          : result.error === "duplicate-id"
            ? "This Employee ID is already in use."
            : result.error === "invalid-id"
              ? "Employee ID must be 3-24 uppercase letters or numbers."
              : "Enter name and phone number to save this member."
      );
    }
  };

  return (
    <div className="border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold" style={{ color: theme.fontColor }}>
          {editing ? "Edit member" : "Add member"}
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

      <div className="flex items-center justify-between gap-3 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3">
          <div className="relative shrink-0">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border"
              style={{ borderColor: theme.borderColor, backgroundColor: "var(--field-bg)" }}
            >
              {form.photo ? (
                <img src={form.photo} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={26} style={{ color: withAlpha(theme.fontColor, "80") }} />
              )}
            </div>
            <button
              type="button"
              onClick={() => (form.photo ? set("photo")(null) : inputRef.current?.click())}
              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors hover:bg-white/10"
              style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
              aria-label={form.photo ? "Remove photo" : "Upload photo"}
              title={form.photo ? "Remove photo" : "Upload photo"}
            >
              {form.photo ? <X size={12} /> : <Upload size={12} />}
            </button>
            <input ref={inputRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-sm font-medium" style={{ color: form.status === "Active" ? theme.fontColor : withAlpha(theme.fontColor, "80") }}>
            {form.status}
          </span>
          <Toggle checked={form.status === "Active"} onChange={(checked) => set("status")(checked ? "Active" : "Inactive")} accent={theme.accentColor} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2" style={{ borderTop: `1px solid ${withAlpha(theme.borderColor, "40")}` }}>
        <FormField label="Full Name" theme={theme}>
          <TextInput value={form.name} onChange={set("name")} placeholder="e.g. Ananya Sharma" theme={theme} />
        </FormField>
        <FormField
          label="Employee ID"
          tooltip="Use the employee ID issued by the company. If the member does not have one, keep the generated unique ID."
          error={idError}
          theme={theme}
        >
          <TextInput value={form.employeeId} onChange={(value) => set("employeeId")(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24))} placeholder="e.g. WQR48392017 or EMP001" theme={theme} />
        </FormField>
        <FormField label="Role" theme={theme}>
          <SelectInput
            value={form.role}
            onChange={(role) =>
              setForm((current) => ({
                ...current,
                role,
                deskIds: memberCanBeAssignedToDesk({ role }) ? current.deskIds : [],
                serviceIds: memberCanBeAssignedToService({ role }) ? current.serviceIds : [],
              }))
            }
            options={ROLES}
            theme={theme}
          />
        </FormField>
        {canAssignServices ? (
          <FormField label={`Assigned ${labels.serviceWordPlural}`} theme={theme}>
            <MultiSelectInput
              items={services}
              selectedIds={form.serviceIds}
              onChange={set("serviceIds")}
              placeholder={`Select ${labels.serviceWordPluralLower}`}
              emptyLabel={`No ${labels.serviceWordPluralLower} defined yet.`}
              theme={theme}
            />
          </FormField>
        ) : null}
        {canAssignDesks ? (
          <FormField
            label={`Assigned ${COUNTER_WORD_PLURAL}`}
            tooltip={!canAssignServices ? `Receptionists can be assigned to ${COUNTER_WORD_PLURAL_LOWER} only.` : ""}
            theme={theme}
          >
            <MultiSelectInput
              items={desks.map((desk) => ({ ...desk, name: counterDisplayName(desk.name) }))}
              selectedIds={form.deskIds}
              onChange={set("deskIds")}
              placeholder={`Select ${COUNTER_WORD_PLURAL_LOWER}`}
              emptyLabel={`No ${COUNTER_WORD_PLURAL_LOWER} defined yet.`}
              theme={theme}
            />
          </FormField>
        ) : null}
        <FormField label="Email Address" theme={theme}>
          <TextInput value={form.email} onChange={set("email")} placeholder="name@waitqr.com" theme={theme} />
        </FormField>
        <FormField label="Phone Number" theme={theme}>
          <TextInput value={form.phone} onChange={set("phone")} placeholder="+91 00000 00000" theme={theme} />
        </FormField>
        <FormField label="About" theme={theme}>
          <TextInput value={form.about} onChange={set("about")} placeholder="Short note or specialization" theme={theme} />
        </FormField>
      </div>

      <div className="mt-2 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end" style={{ borderTop: `1px solid ${withAlpha(theme.borderColor, "40")}`, paddingTop: "1rem" }}>
        {submitError ? (
          <div className="text-xs sm:mr-auto" style={{ color: "#f87171" }}>
            {submitError}
          </div>
        ) : null}
        <button type="button" onClick={onCancel} className="border px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
        >
          {editing ? "Save changes" : "Add member"}
        </button>
      </div>
    </div>
  );
}

function MemberControls({ member, theme, onEdit, onDelete, className = "" }) {
  return (
    <div className={`flex shrink-0 items-center gap-2 lg:gap-3 ${className}`}>
      <span
        className="inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium"
        style={{ color: theme.accentColor, backgroundColor: withAlpha(theme.accentColor, "14") }}
      >
        {member.role || "Member"}
      </span>
      <StatusBadge status={member.status || "Active"} />
      <button type="button" onClick={onEdit} className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10" style={{ backgroundColor: withAlpha(theme.fontColor, "12"), color: withAlpha(theme.fontColor, "b3") }} aria-label="Edit member">
        <Pencil size={14} />
      </button>
      <button type="button" onClick={onDelete} className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10" style={{ backgroundColor: withAlpha(theme.fontColor, "12"), color: "#f87171" }} aria-label="Remove member">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function MemberCard({ member, desks, services, labels, theme, onEdit, onDelete }) {
  const canAssignServices = memberCanBeAssignedToService(member);
  const canAssignDesks = memberCanBeAssignedToDesk(member);
  const assignedDesks = desks.filter((desk) => memberHasDesk(member, desk.id));
  const assignedServices = services.filter((service) => memberHasService(member, service.id));
  const deskLabel = assignedDesks.length ? assignedDesks.map((desk) => counterDisplayName(desk.name)).join(", ") : `No ${COUNTER_WORD_LOWER} assigned`;
  const serviceLabel = assignedServices.length ? assignedServices.map((service) => service.name).join(", ") : `No ${labels.serviceWordPluralLower} assigned`;
  const aboutText = truncateText(member.about, 80);

  return (
    <div className="flex flex-col gap-3 border p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.2 }}>
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}>
          {member.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : <span className="text-sm font-semibold" style={{ color: theme.accentColor }}>{initials(member.name)}</span>}
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <div className="min-w-0">
            <p className="shrink-0 text-xs font-medium" style={{ color: withAlpha(theme.fontColor, "65") }}>
              {member.id}
            </p>
            <p className="mt-1 min-w-0 text-sm font-semibold" style={{ color: theme.fontColor }}>{member.name}</p>
            <div className="mt-2 flex flex-col gap-y-1 text-xs" style={{ color: withAlpha(theme.fontColor, "80") }}>
              <span className="flex min-w-0 items-center gap-1.5"><Mail size={12} className="shrink-0" /><span className="min-w-0 break-all">{member.email || "—"}</span></span>
              <span className="flex min-w-0 items-center gap-1.5"><Phone size={12} className="shrink-0" /><span className="min-w-0">{member.phone || "—"}</span></span>
            </div>
          </div>
        </div>

        <MemberControls member={member} theme={theme} onEdit={onEdit} onDelete={onDelete} className="hidden sm:flex" />
      </div>

      <div className="min-w-0">
        {aboutText ? (
          <p className="text-xs" style={{ color: withAlpha(theme.fontColor, "76") }}>
            {aboutText}
          </p>
        ) : null}
        {canAssignDesks ? (
          <div className="mt-2 space-y-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium" style={{ color: assignedDesks.length ? theme.accentColor : "#f87171" }}>
                {deskLabel}
                {canAssignServices ? <ChevronRight size={13} className="shrink-0" style={{ color: withAlpha(theme.fontColor, "55") }} /> : null}
              </span>
              {canAssignServices ? <span className="min-w-0 break-words" style={{ color: theme.fontColor }}>{serviceLabel}</span> : null}
            </div>
          </div>
        ) : null}
      </div>

      <MemberControls member={member} theme={theme} onEdit={onEdit} onDelete={onDelete} className="flex-wrap sm:hidden" />
    </div>
  );
}

export function AdminMembersPage({
  desks,
  services,
  members,
  brandName,
  labels,
  askConfirm,
  memberActions,
  manageUi,
  theme,
  settingsSaving = false,
  settingsSaveError = "",
}) {
  const { addMember, updateMember, removeMember } = memberActions;
  const { editingMember, setEditingMember, showAddMember, setShowAddMember } = manageUi.members;
  const [query, setQuery] = useState("");
  const editingMemberRecord = editingMember ? members.find((member) => member.id === editingMember) : null;
  const showForm = showAddMember || Boolean(editingMemberRecord);
  const formTheme = { ...theme, bgColor: theme.bgColor || "#04060b" };

  const filtered = members.filter((member) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const deskNames = desks.filter((desk) => memberHasDesk(member, desk.id)).map((desk) => desk.name);
    const serviceNames = services.filter((service) => memberHasService(member, service.id)).map((service) => service.name);
    return [member.name, member.id, member.role, member.email, member.phone, member.about, ...deskNames, ...serviceNames]
      .some((value) => String(value || "").toLowerCase().includes(q));
  });

  const closeForm = () => {
    setShowAddMember(false);
    setEditingMember(null);
  };

  const saveForm = (form) => {
    if (editingMemberRecord) {
      const result = updateMember(editingMemberRecord.id, {
        id: form.employeeId.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24),
        name: form.name.trim(),
        phone: form.phone.trim().replace(/\D/g, ""),
        photo: form.photo || null,
        about: form.about.trim(),
        role: form.role,
        email: form.email.trim(),
        status: form.status,
        deskIds: form.deskIds,
        serviceIds: form.serviceIds,
      });
      if (result?.ok === false) return result;
      closeForm();
      return { ok: true };
    }

    const result = addMember(form);
    if (result.ok) closeForm();
    return result;
  };

  return (
    <div style={{ "--field-bg": "rgba(255,255,255,0.04)" }}>
      <main className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
        {showForm ? (
          <MemberForm
            key={editingMemberRecord ? `edit-${editingMemberRecord.id}` : "add"}
            members={members}
            desks={desks}
            services={services}
            labels={labels}
            theme={formTheme}
            brandName={brandName}
            editing={editingMemberRecord}
            onCancel={closeForm}
            onSave={saveForm}
          />
        ) : null}

        <div className="border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 min-[480px]:flex-nowrap">
            <div className="relative w-full max-w-xs min-[480px]:min-w-0 min-[480px]:flex-1">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members by name, ID, or role"
                {...focusHandlers(theme)}
                style={fieldStyle(theme)}
                className="w-full border py-2 pl-9 pr-3 text-sm outline-none transition-colors"
              />
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: withAlpha(theme.fontColor, "80") }} />
            </div>
            <div className="flex w-full items-center justify-start gap-3 min-[480px]:ml-auto min-[480px]:w-auto min-[480px]:justify-end">
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
                    setEditingMember(null);
                    setShowAddMember(true);
                  }}
                  className="flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
                >
                  <Plus size={15} />
                  Add member
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
                No members match your search.
              </p>
            ) : null}
            {filtered.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                desks={desks}
                services={services}
                labels={labels}
                theme={formTheme}
                onEdit={() => {
                  setEditingMember(member.id);
                  setShowAddMember(false);
                }}
                onDelete={() =>
                  askConfirm(
                    "Delete this member?",
                    `"${member.name}" will lose access and be unassigned from every ${COUNTER_WORD_LOWER}.`,
                    () => {
                      removeMember(member.id);
                      closeForm();
                    },
                    { confirmLabel: "Delete", variant: "destructive" }
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
