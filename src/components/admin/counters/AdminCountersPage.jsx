import { useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronRight, CircleCheck, CircleX, Clock, ExternalLink, Layers3, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { assignedMembersForDesk, memberCanBeAssignedToDesk, memberCanBeAssignedToService, memberHasService } from "../../../lib/assignments";

const COUNTER_WORD = "Counter";
const COUNTER_WORD_LOWER = "counter";
const COUNTER_WORD_PLURAL_LOWER = "counters";
const AVAILABILITY_OPTIONS = [
  { value: "always_open", label: "Always open", status: "Available" },
  { value: "always_closed", label: "Always closed", status: "Unavailable" },
  { value: "scheduled", label: "Scheduled", status: "Scheduled" },
];
const WEEK_DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

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
  if (status === "Scheduled") return "Scheduled";
  return status === "Unavailable" ? "Closed" : "Open";
}

function statusForAvailabilityMode(mode) {
  return AVAILABILITY_OPTIONS.find((option) => option.value === mode)?.status || "Available";
}

function availabilityModeForDesk(desk) {
  if (desk?.availabilityMode) return desk.availabilityMode;
  if (desk?.status === "Scheduled") return "scheduled";
  if (desk?.status === "Unavailable") return "always_closed";
  return "always_open";
}

function normalizeSchedule(schedule) {
  const source = schedule && typeof schedule === "object" ? schedule : {};
  const validDays = new Set(WEEK_DAYS.map((day) => day.value));
  const sourceEntries = Array.isArray(source.entries) && source.entries.length
    ? source.entries
    : Array.isArray(source.days)
      ? [{ days: source.days, startTime: source.startTime, endTime: source.endTime }]
      : [{ days: [1], startTime: source.startTime, endTime: source.endTime }];
  const usedDays = new Set();
  const entries = sourceEntries
    .map((entry) => {
      const entryDays = Array.isArray(entry?.days) ? entry.days : [entry?.day];
      const days = entryDays
        .map(Number)
        .filter((day) => validDays.has(day) && !usedDays.has(day) && usedDays.add(day));

      return {
        days,
        startTime: entry?.startTime || "09:00",
        endTime: entry?.endTime || "17:00",
      };
    })
    .filter((entry) => entry.days.length > 0)
    .slice(0, WEEK_DAYS.length);

  return {
    entries: entries.length ? entries : [{ days: [1], startTime: "09:00", endTime: "17:00" }],
  };
}

function timeToMinutes(time) {
  const [hours, minutes] = String(time || "").split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function isScheduleOpenNow(schedule, now = new Date()) {
  const normalized = normalizeSchedule(schedule);
  const currentDay = now.getDay();
  const previousDay = (currentDay + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return normalized.entries.some((entry) => {
    const start = timeToMinutes(entry.startTime);
    const end = timeToMinutes(entry.endTime);
    if (start == null || end == null) return false;

    if (start <= end) {
      return entry.days.includes(currentDay) && currentMinutes >= start && currentMinutes < end;
    }

    return (entry.days.includes(currentDay) && currentMinutes >= start) || (entry.days.includes(previousDay) && currentMinutes < end);
  });
}

function nextScheduleDays(entries) {
  const usedDays = new Set((Array.isArray(entries) ? entries : []).flatMap((entry) => entry.days || []).map(Number));
  const nextDay = WEEK_DAYS.find((day) => !usedDays.has(day.value))?.value ?? WEEK_DAYS[0].value;
  return [nextDay];
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

function TimeInput({ value, onChange, theme }) {
  const darkIcon = String(theme.fontColor || "").toLowerCase() !== "#0f172a";
  const inputRef = useRef(null);
  const formattedValue = (() => {
    const [hourValue, minuteValue] = String(value || "").split(":").map(Number);
    if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return value || "";
    const period = hourValue >= 12 ? "PM" : "AM";
    const displayHour = hourValue % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(minuteValue).padStart(2, "0")} ${period}`;
  })();
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === "function") {
      input.showPicker();
    }
  };

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...focusHandlers(theme)}
        className="qp-time-input h-10 min-w-0 w-full appearance-none border px-2 pr-8 text-sm text-transparent outline-none transition-colors sm:px-3 sm:pr-9"
        style={{ ...fieldStyle(theme), color: "transparent", caretColor: theme.fontColor, colorScheme: darkIcon ? "dark" : "light" }}
      />
      <span
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[13px] sm:left-3 sm:text-sm"
        style={{ color: theme.fontColor }}
      >
        {formattedValue}
      </span>
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ color: withAlpha(theme.fontColor, "b3") }}
        aria-label="Open time picker"
      >
        <Clock size={14} />
      </button>
    </div>
  );
}

function SelectInput({ value, onChange, children, theme }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...focusHandlers(theme)}
        className="w-full appearance-none border px-3 py-2 pr-9 text-sm outline-none transition-colors"
        style={fieldStyle(theme)}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: withAlpha(theme.fontColor, "80") }}
      />
    </div>
  );
}

function CounterForm({ desks, theme, editingDesk, isSaving, onCancel, onSave }) {
  const [name, setName] = useState(() => editingDesk?.name || "");
  const [availabilityMode, setAvailabilityMode] = useState(() => availabilityModeForDesk(editingDesk));
  const [schedule, setSchedule] = useState(() => normalizeSchedule(editingDesk?.schedule));
  const [submitError, setSubmitError] = useState("");
  const duplicateName = desks.some((desk) => desk.id !== editingDesk?.id && desk.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nameError = !name.trim() ? `${COUNTER_WORD} name is required.` : duplicateName ? `This ${COUNTER_WORD_LOWER} already exists.` : "";
  const scheduleDays = schedule.entries.flatMap((entry) => entry.days || []).map(Number);
  const scheduleValid = availabilityMode !== "scheduled"
    || (
      schedule.entries.length > 0
      && schedule.entries.length <= WEEK_DAYS.length
      && new Set(scheduleDays).size === scheduleDays.length
      && schedule.entries.every((entry) => entry.days.length > 0 && entry.startTime && entry.endTime)
    );
  const canSave = name.trim() && !duplicateName && scheduleValid;
  const counterNumber = editingDesk ? Math.max(1, desks.findIndex((desk) => desk.id === editingDesk.id) + 1) : desks.length + 1;
  const status = statusForAvailabilityMode(availabilityMode);

  const addScheduleEntry = () => {
    setSchedule((current) => ({
      ...current,
      entries: [
        ...current.entries,
        { days: nextScheduleDays(current.entries), startTime: "09:00", endTime: "17:00" },
      ].slice(0, WEEK_DAYS.length),
    }));
  };

  const updateScheduleEntry = (index, patch) => {
    setSchedule((current) => ({
      ...current,
      entries: current.entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    }));
  };

  const toggleScheduleEntryDay = (index, day) => {
    setSchedule((current) => ({
      ...current,
      entries: current.entries.map((entry, entryIndex) => {
        if (entryIndex !== index) return entry;
        const days = entry.days.includes(day) ? entry.days.filter((item) => item !== day) : [...entry.days, day].sort((a, b) => a - b);
        return { ...entry, days };
      }),
    }));
  };

  const removeScheduleEntry = (index) => {
    setSchedule((current) => ({
      ...current,
      entries: current.entries.filter((_, entryIndex) => entryIndex !== index),
    }));
  };

  const handleSave = () => {
    if (!canSave) return;

    const result = onSave({
      name: name.trim(),
      status,
      availabilityMode,
      schedule: availabilityMode === "scheduled" ? { entries: schedule.entries } : null,
    });
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
      </div>

      <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,0.8fr)]" style={{ borderTop: `1px solid ${withAlpha(theme.borderColor, "40")}` }}>
        <FormField label={`${COUNTER_WORD} Name`} error={nameError} theme={theme}>
          <TextInput value={name} onChange={setName} placeholder={`e.g. ${COUNTER_WORD} 2`} theme={theme} />
        </FormField>
        <FormField label="Availability" theme={theme}>
          <SelectInput value={availabilityMode} onChange={setAvailabilityMode} theme={theme}>
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        </FormField>
      </div>

      {availabilityMode === "scheduled" ? (
        <div className="border-t py-2" style={{ borderColor: withAlpha(theme.borderColor, "40") }}>
          <p className="pt-2 text-sm font-semibold" style={{ color: theme.fontColor }}>
            Create schedule
          </p>
          <div className="grid grid-cols-1 gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(8rem,0.4fr)_minmax(8rem,0.4fr)]">
            <div className="py-2 lg:col-span-3">
              <div className="mb-1 hidden grid-cols-[minmax(20rem,1fr)_minmax(8rem,0.35fr)_minmax(8rem,0.35fr)_auto] gap-2 px-0.5 text-xs font-medium xl:grid" style={{ color: withAlpha(theme.fontColor, "80") }}>
                <span>Week</span>
                <span>Start Time</span>
                <span>End Time</span>
                <span className="sr-only">Action</span>
              </div>
              <div className="flex flex-col gap-4">
                {schedule.entries.map((entry, index) => {
                  const selectedByOtherRows = new Set(schedule.entries.filter((_, entryIndex) => entryIndex !== index).flatMap((item) => item.days || []).map(Number));
                  return (
                    <div key={`${entry.days.join("-")}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.5rem] gap-x-2 gap-y-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:grid-cols-[minmax(20rem,1fr)_minmax(8rem,0.35fr)_minmax(8rem,0.35fr)_auto]">
                      <div className="col-span-3 grid grid-cols-7 gap-1 md:col-span-3 md:flex md:flex-wrap md:gap-2 xl:col-span-1">
                        {WEEK_DAYS.map((day) => {
                          const active = entry.days.includes(day.value);
                          const disabled = selectedByOtherRows.has(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => toggleScheduleEntryDay(index, day.value)}
                              disabled={disabled}
                              className="h-9 min-w-0 border px-0 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-35 md:h-auto md:px-3 md:py-2 md:text-xs"
                              style={{
                                borderColor: active ? theme.accentColor : theme.borderColor,
                                borderRadius: theme.radius,
                                backgroundColor: active ? withAlpha(theme.accentColor, "1f") : "transparent",
                                color: active ? theme.accentColor : withAlpha(theme.fontColor, "99"),
                              }}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <TimeInput value={entry.startTime} onChange={(startTime) => updateScheduleEntry(index, { startTime })} theme={theme} />
                      <TimeInput value={entry.endTime} onChange={(endTime) => updateScheduleEntry(index, { endTime })} theme={theme} />
                      <button
                        type="button"
                        onClick={() => removeScheduleEntry(index)}
                        disabled={schedule.entries.length <= 1}
                        className="flex h-10 w-10 items-center justify-center border transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35"
                        style={{ color: "#f87171", borderColor: theme.borderColor, borderRadius: theme.radius }}
                        aria-label="Remove schedule row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {!scheduleValid ? (
                <p className="mt-2 text-xs" style={{ color: "#f87171" }}>
                  Select at least one weekday per row, use each weekday once, and fill each start and end time.
                </p>
              ) : null}
              <button
                type="button"
                onClick={addScheduleEntry}
                disabled={scheduleDays.length >= WEEK_DAYS.length}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 border px-3 text-xs font-medium transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-35 sm:inline-flex sm:w-auto"
                style={{ color: theme.accentColor, borderColor: theme.borderColor, borderRadius: theme.radius }}
              >
                <Plus size={14} />
                Add day
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
      className="group relative inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium"
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
  const availabilityMode = availabilityModeForDesk(desk);
  const scheduled = availabilityMode === "scheduled" || desk.status === "Scheduled";
  const available = scheduled ? isScheduleOpenNow(desk.schedule) : availabilityMode !== "always_closed" && desk.status !== "Unavailable";
  const statusColor = scheduled && !available ? "#f59e0b" : available ? "#22c55e" : "#ef4444";
  const statusBackground = scheduled && !available ? "rgba(245,158,11,0.15)" : available ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)";
  const StatusIcon = scheduled ? CalendarDays : available ? CircleCheck : CircleX;

  return (
    <div className="flex flex-col gap-3 border p-4 lg:flex-row lg:items-start" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.2 }}>
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
              <span className="inline-flex h-7 items-center rounded-full px-2.5 text-xs font-medium" style={{ backgroundColor: withAlpha(theme.accentColor, "1f"), color: theme.accentColor }}>
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

      <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 lg:justify-end lg:gap-3">
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium" style={{ backgroundColor: statusBackground, color: statusColor }}>
          <StatusIcon size={12} />
          {available ? "Open" : "Closed"}
        </span>
        <CountChip icon={UserRound} count={serviceMembers.length} label={memberCountLabel} tooltip={memberLabel} tooltipItems={memberTooltipItems} tone={serviceMembers.length === 0 ? "warning" : "neutral"} theme={theme} />
        <CountChip icon={Layers3} count={assignedServices.length} label={serviceCountLabel} tooltip={serviceCoverageLabel} tooltipItems={serviceCoverageItems} theme={theme} />
        <button type="button" onClick={onEdit} className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10" style={{ backgroundColor: withAlpha(theme.fontColor, "12"), color: withAlpha(theme.fontColor, "b3") }} aria-label={`Edit ${COUNTER_WORD_LOWER}`}>
          <Pencil size={14} />
        </button>
        <button type="button" onClick={onDelete} className="inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-white/10" style={{ backgroundColor: withAlpha(theme.fontColor, "12"), color: "#f87171" }} aria-label={`Remove ${COUNTER_WORD_LOWER}`}>
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
  const formRef = useRef(null);
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

  const scrollToForm = () => {
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const saveForm = ({ name, status, availabilityMode, schedule }) => {
    const duplicateName = desks.some((desk) => desk.id !== editingDeskRecord?.id && desk.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicateName) return { ok: false, error: "duplicate-name" };
    const availabilityDetails = { status, availabilityMode, schedule };

    if (editingDeskRecord) {
      updateDesk?.(editingDeskRecord.id, { name, ...availabilityDetails });
      if (!updateDesk) renameDesk(editingDeskRecord.id, name);
      closeForm();
      return { ok: true };
    }

    const result = addDeskWithAssignments(name, [], availabilityDetails);
    if (result.ok) closeForm();
    return result;
  };

  return (
    <div style={{ "--field-bg": "rgba(255,255,255,0.04)" }}>
      <main className="space-y-4 px-2.5 py-2.5 sm:space-y-6 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
        {showForm ? (
          <div ref={formRef}>
            <CounterForm
              key={editingDeskRecord ? `edit-${editingDeskRecord.id}` : "add"}
              desks={desks}
              theme={formTheme}
              editingDesk={editingDeskRecord}
              isSaving={settingsSaving}
              onCancel={closeForm}
              onSave={saveForm}
            />
          </div>
        ) : null}

        <div className="border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 min-[480px]:flex-nowrap">
            <div className="relative w-full max-w-xs min-[480px]:min-w-0 min-[480px]:flex-1">
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
                    setEditingDesk(null);
                    setShowAddDesk(true);
                  }}
                  className="flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
                >
                  <Plus size={15} />
                  Add {COUNTER_WORD_LOWER}
                </button>
              ) : null}
            </div>
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
                  scrollToForm();
                }}
                onDelete={() =>
                  askConfirm(
                    `Delete this ${COUNTER_WORD_LOWER}?`,
                    `"${desk.name}" will be deleted and any active ticket will return to the queue.`,
                    () => {
                      removeDesk(desk.id);
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
