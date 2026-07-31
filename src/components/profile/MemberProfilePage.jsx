import { CalendarDays, Check, Clock3, ExternalLink, KeyRound, Layers3, LayoutDashboard, Lock, LogIn, LogOut, Mail, Pencil, Phone, Monitor, Moon, Star, Sun, Unlock, Upload, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readImageFile } from "../../lib/imageUpload";
import { normalizeMemberRole } from "../../lib/assignments";
import { getDeskPath, getMemberProfilePath } from "../../lib/routing";
import { NotificationMenu } from "../shared/NotificationMenu";

const THEME_PRESETS = {
  Dark: { accentColor: "#2563eb", bgColor: "#04060b", fontColor: "#e2e8f0", borderColor: "#171d2b", separatorColor: "#171d2b" },
  Light: { accentColor: "#2563eb", bgColor: "#f8fafc", fontColor: "#0f172a", borderColor: "#e2e8f0", separatorColor: "#e2e8f0" },
};

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function hexToRgb(hex) {
  if (!hex || hex.length !== 7) return null;
  const clean = hex.slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function mixHex(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  if (!a || !b) return from;
  return rgbToHex({
    r: a.r + (b.r - a.r) * amount,
    g: a.g + (b.g - a.g) * amount,
    b: a.b + (b.b - a.b) * amount,
  });
}

function isLightHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 180;
}

function mutedPageBackground(bgColor, accentColor) {
  if (!isLightHex(bgColor)) return mixHex(bgColor, "#000000", 0.45);
  return mixHex(mixHex(bgColor, accentColor || bgColor, 0.035), "#94a3b8", 0.08);
}

function profileCardStyle(theme) {
  return {
    borderColor: theme.borderColor,
    borderRadius: theme.radius * 1.2,
    background: "var(--surface-bg, transparent)",
  };
}

function resolveThemeMode(themeMode) {
  if (themeMode === "System") {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "Dark" : "Light";
  }
  return themeMode === "Light" ? "Light" : "Dark";
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "MB";
}

function itemsForIds(items, ids) {
  const selected = new Set((Array.isArray(ids) ? ids : []).map(String));
  return (Array.isArray(items) ? items : []).filter((item) => selected.has(String(item.id)));
}

const SERVICE_HISTORY_HALF_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_VALID_SERVICE_MS = 15 * 1000;
const MAX_VALID_SERVICE_MS = 4 * 60 * 60 * 1000;
const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

export function memberServiceInsights(member, services, submissions, now = Date.now()) {
  const memberId = String(member?.id || "");
  const assignedDeskIds = new Set((Array.isArray(member?.deskIds) ? member.deskIds : []).map(String));
  const completedByMember = (Array.isArray(submissions) ? submissions : []).filter(
    (submission) => submission.status === "completed"
      && String(submission.servedByMemberId || "") === memberId,
  );

  const serviceInsights = (Array.isArray(services) ? services : []).map((service) => {
    const serviceSubmissions = (Array.isArray(submissions) ? submissions : []).filter(
      (submission) => String(submission.serviceId || "") === String(service.id)
        && (!assignedDeskIds.size || assignedDeskIds.has(String(submission.deskId ?? ""))),
    );
    const history = completedByMember.filter(
      (submission) => String(submission.serviceId || "") === String(service.id),
    );
    const durations = history
      .map((submission) => ({
        completedAt: Number(submission.completedAt || submission.statusUpdatedAt || 0),
        durationMs: Number(submission.completedAt) - Number(submission.startedAt),
      }))
      .filter(({ durationMs }) => durationMs >= MIN_VALID_SERVICE_MS && durationMs <= MAX_VALID_SERVICE_MS);
    const weightedDuration = durations.reduce(
      (result, sample) => {
        const ageMs = Math.max(0, now - sample.completedAt);
        const weight = Math.pow(0.5, ageMs / SERVICE_HISTORY_HALF_LIFE_MS);
        return {
          total: result.total + sample.durationMs * weight,
          weight: result.weight + weight,
        };
      },
      { total: 0, weight: 0 },
    );
    const ratings = history
      .map((submission) => Number(submission.feedbackRating))
      .filter((rating) => rating >= 1 && rating <= 5);

    return {
      ...service,
      waitingCount: serviceSubmissions.filter(
        (submission) => submission.status === "queued" || submission.status === "called",
      ).length,
      absentCount: serviceSubmissions.filter(
        (submission) => submission.status === "skipped" || submission.status === "removed",
      ).length,
      servedCount: history.length,
      estimatedServiceMs: weightedDuration.weight ? weightedDuration.total / weightedDuration.weight : null,
      durationSampleCount: durations.length,
      averageRating: ratings.length
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null,
      ratingCount: ratings.length,
    };
  });
  const allRatings = completedByMember
    .map((submission) => Number(submission.feedbackRating))
    .filter((rating) => rating >= 1 && rating <= 5);

  return {
    services: serviceInsights,
    averageRating: allRatings.length
      ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
      : null,
    ratingCount: allRatings.length,
  };
}

export function counterActivityInsights(desks, submissions, member = null) {
  const allSubmissions = Array.isArray(submissions) ? submissions : [];
  const memberId = String(member?.id || "");
  const assignedServiceIds = new Set((Array.isArray(member?.serviceIds) ? member.serviceIds : []).map(String));
  const isRelevantWaitingSubmission = (submission) => !assignedServiceIds.size
    || assignedServiceIds.has(String(submission.serviceId ?? ""));

  return (Array.isArray(desks) ? desks : []).map((desk) => {
    const deskSubmissions = allSubmissions.filter(
      (submission) => String(submission.deskId ?? "") === String(desk.id),
    );
    const completedSubmissions = deskSubmissions.filter((submission) => submission.status === "completed");

    return {
      ...desk,
      waitingCount: deskSubmissions.filter(
        (submission) => (submission.status === "queued" || submission.status === "called")
          && isRelevantWaitingSubmission(submission),
      ).length,
      absentCount: deskSubmissions.filter(
        (submission) => (submission.status === "skipped" || submission.status === "removed")
          && isRelevantWaitingSubmission(submission),
      ).length,
      servedCount: completedSubmissions.filter(
        (submission) => !memberId || String(submission.servedByMemberId || "") === memberId,
      ).length,
    };
  });
}

function formatEstimatedServiceTime(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "Est. pending";
  const minutes = Math.max(1, Math.round(milliseconds / 60_000));
  if (minutes < 60) return `Est. ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `Est. ${hours} hr ${remainder} min` : `Est. ${hours} hr`;
}

function RatingSummary({ average, count, theme, compact = false }) {
  const hasRatings = Number.isFinite(average) && count > 0;

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 ${compact ? "text-xs" : "text-sm"}`}
      style={{ color: hasRatings ? "#f59e0b" : withAlpha(theme.fontColor, "70") }}
      aria-label={hasRatings ? `${average.toFixed(1)} out of 5 from ${count} ratings` : "No ratings yet"}
    >
      <Star size={compact ? 13 : 15} fill={hasRatings ? "currentColor" : "none"} />
      <span className="font-semibold">{hasRatings ? average.toFixed(1) : "No ratings"}</span>
      {hasRatings ? (
        <span className="font-normal" style={{ color: withAlpha(theme.fontColor, "70") }}>
          ({count})
        </span>
      ) : null}
    </span>
  );
}

function counterDisplayName(name) {
  const text = String(name || "").trim();
  if (!text) return "Counter";
  return text.replace(/^desk\b/i, "Counter");
}

function availabilityModeForDesk(desk) {
  if (desk?.status === "Scheduled") return "scheduled";
  if (desk?.status === "Unavailable") return "always_closed";
  if (desk?.status === "Available") return "always_open";
  if (desk?.availabilityMode) return desk.availabilityMode;
  return "always_open";
}

function normalizeSchedule(schedule) {
  const source = schedule && typeof schedule === "object" ? schedule : {};
  const sourceEntries = Array.isArray(source.entries) && source.entries.length
    ? source.entries
    : Array.isArray(source.days)
      ? [{ days: source.days, startTime: source.startTime, endTime: source.endTime }]
      : [{ days: [1], startTime: source.startTime, endTime: source.endTime }];

  return {
    entries: sourceEntries
      .map((entry) => ({
        days: (Array.isArray(entry?.days) ? entry.days : [entry?.day])
          .map(Number)
          .filter((day) => WEEK_DAYS.includes(day)),
        startTime: entry?.startTime || "09:00",
        endTime: entry?.endTime || "17:00",
      }))
      .filter((entry) => entry.days.length),
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
    if (start <= end) return entry.days.includes(currentDay) && currentMinutes >= start && currentMinutes < end;
    return (entry.days.includes(currentDay) && currentMinutes >= start) || (entry.days.includes(previousDay) && currentMinutes < end);
  });
}

function counterStatusState(desk) {
  const availabilityMode = availabilityModeForDesk(desk);
  const scheduled = availabilityMode === "scheduled" || desk?.status === "Scheduled";
  const available = scheduled ? isScheduleOpenNow(desk?.schedule) : availabilityMode !== "always_closed" && desk?.status !== "Unavailable";

  if (scheduled) return { Icon: CalendarDays, color: available ? "#22c55e" : "#f59e0b" };
  return available ? { Icon: Unlock, color: "#22c55e" } : { Icon: Lock, color: "#ef4444" };
}

function displayRoleName(role, fallback = "Member") {
  const value = String(role || fallback).trim();
  return value === "Administrator" ? "Admin" : value;
}

function roleChipState(member, fallback) {
  const inactive = member?.status === "Inactive";
  return {
    label: inactive ? "Inactive" : displayRoleName(member?.role, fallback),
    color: inactive ? "#ef4444" : "#22c55e",
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

function FormField({ label, children, error, theme }) {
  return (
    <div className="py-1.5">
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

function TextInput({ value, onChange, placeholder, theme, inputMode, type = "text" }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      type={type}
      {...focusHandlers(theme)}
      className="w-full border px-3 py-2 text-sm outline-none transition-colors placeholder:text-current placeholder:opacity-40"
      style={fieldStyle(theme)}
    />
  );
}

function ThemeSwitch({ theme, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const options = [
    { value: "Light", icon: Sun, label: "Light" },
    { value: "Dark", icon: Moon, label: "Dark" },
    { value: "System", icon: Monitor, label: "System" },
  ];
  const Current = options.find((option) => option.value === theme.themeMode)?.icon || Monitor;

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative z-50" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Change theme"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/5"
        style={{ color: withAlpha(theme.fontColor, "99") }}
      >
        <Current size={18} />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden border py-1 shadow-xl" style={{ backgroundColor: "var(--surface-bg, transparent)", borderColor: theme.borderColor, borderRadius: theme.radius }}>
          {options.map(({ value, icon: Icon, label }) => {
            const active = theme.themeMode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onChange?.(value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                style={{ color: active ? theme.accentColor : theme.fontColor }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ProfileHeader({ member, loggedInMember, masterLoggedIn, members, theme, notifications = [], onClearNotifications, onMarkNotificationsRead, subtitle = "Member profile", brandTitle, hideBrandMark = false, fullWidth = false, backgroundColor, onThemeChange, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeMember = loggedInMember || null;
  const signedIn = Boolean(activeMember || masterLoggedIn);
  const canVisitDashboard = Boolean(masterLoggedIn || normalizeMemberRole(activeMember?.role) === "Administrator");
  const displayName = activeMember?.name || (masterLoggedIn ? "Development Access" : "Account");
  const displayRole = activeMember ? displayRoleName(activeMember.role) : masterLoggedIn ? "Master login" : "Login required";
  const logoUrl = theme.logoUrl;
  const systemName = theme.systemName || "WaitQR";
  const title = brandTitle || systemName;

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleAction = (action) => {
    action?.();
    setOpen(false);
  };

  return (
    <header className="relative z-40 w-full px-2.5 py-2.5 sm:px-6 sm:py-5" style={{ backgroundColor: backgroundColor || theme.bgColor }}>
      <div className={`mx-auto flex w-full items-center justify-between gap-3 ${fullWidth ? "max-w-none" : "max-w-5xl"}`}>
        <button type="button" onClick={() => onNavigate?.("/")} className="flex min-w-0 items-center gap-2 text-left">
          {!hideBrandMark ? (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden text-sm font-semibold text-white"
              style={{ backgroundColor: logoUrl ? "transparent" : theme.accentColor, borderRadius: theme.radius }}
            >
              {logoUrl ? <img src={logoUrl} alt={`${systemName} logo`} className="h-full w-full object-cover" /> : systemName.slice(0, 1).toUpperCase()}
            </span>
          ) : null}
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold" style={{ color: theme.fontColor }}>
              {title}
            </span>
            {subtitle ? (
              <span className="hidden text-xs sm:block" style={{ color: withAlpha(theme.fontColor, "80") }}>
                {subtitle}
              </span>
            ) : null}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-2">
          {canVisitDashboard ? (
            <button
              type="button"
              onClick={() => onNavigate?.("/")}
              className="hidden items-center gap-2 border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/5 sm:inline-flex"
              style={{ color: theme.fontColor, borderColor: theme.borderColor, borderRadius: theme.radius }}
            >
              <LayoutDashboard size={15} />
              Dashboard
            </button>
          ) : null}

          <ThemeSwitch theme={theme} onChange={onThemeChange} />
          {signedIn ? <NotificationMenu notifications={notifications} theme={theme} onClear={onClearNotifications} onMarkRead={onMarkNotificationsRead} /> : null}

          <div className="relative z-50" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="Open profile menu"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full transition-colors hover:bg-white/5"
              style={{ backgroundColor: withAlpha(theme.accentColor, signedIn ? "24" : "14"), color: signedIn ? theme.accentColor : withAlpha(theme.fontColor, "99") }}
            >
              {activeMember?.photo ? <img src={activeMember.photo} alt={activeMember.name} className="h-full w-full object-cover" /> : activeMember ? initials(activeMember.name) : <UserRound size={17} />}
            </button>

            {open ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden border py-1 shadow-xl" style={{ backgroundColor: "var(--surface-bg, transparent)", borderColor: theme.borderColor, borderRadius: theme.radius }}>
                <div className="border-b px-3 py-2" style={{ borderColor: withAlpha(theme.borderColor, "88") }}>
                  <p className="truncate text-sm font-medium" style={{ color: theme.fontColor }}>
                    {displayName}
                  </p>
                  <p className="truncate text-xs" style={{ color: withAlpha(theme.fontColor, "80") }}>
                    {displayRole}
                  </p>
                </div>
                {signedIn ? (
                  <>
                    {canVisitDashboard ? (
                      <button
                        type="button"
                        onClick={() => handleAction(() => onNavigate?.("/"))}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5 sm:hidden"
                        style={{ color: theme.fontColor }}
                      >
                        <LayoutDashboard size={15} />
                        Dashboard
                      </button>
                    ) : null}
                    {activeMember ? (
                      <button
                        type="button"
                        onClick={() => handleAction(() => onNavigate?.(getMemberProfilePath(activeMember, members)))}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                        style={{ color: theme.fontColor }}
                      >
                        <UserRound size={15} />
                        Profile
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleAction(onLogout)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                      style={{ color: theme.fontColor }}
                    >
                      <LogOut size={15} />
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onNavigate?.("/login"))}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                    style={{ color: theme.accentColor }}
                  >
                    <LogIn size={15} />
                    Login
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export function MemberProfilePage({ member, desks, services, submissions = [], labels, theme, loading = false, loggedInMember, masterLoggedIn = false, members = [], notifications = [], onClearNotifications, onMarkNotificationsRead, onAppearanceChange, onUpdateMember, onLogout, onNavigate }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", about: "", photo: null });
  const [editError, setEditError] = useState("");
  const [expandedCounters, setExpandedCounters] = useState({});
  const [profileTab, setProfileTab] = useState("counters");
  const photoInputRef = useRef(null);
  const allSubmissions = Array.isArray(submissions) ? submissions : [];
  const assignedDeskIds = new Set((Array.isArray(member?.deskIds) ? member.deskIds : []).map(String));
  const deskById = new Map((Array.isArray(desks) ? desks : []).map((desk) => [String(desk.id), desk]));
  const historicalDeskIds = allSubmissions
    .filter(
      (submission) => submission.status === "completed"
        && String(submission.servedByMemberId || "") === String(member?.id || "")
        && submission.deskId != null,
    )
    .map((submission) => String(submission.deskId));
  const visibleDesks = Array.from(new Set([...assignedDeskIds, ...historicalDeskIds]))
    .map((deskId) => {
      const desk = deskById.get(deskId);
      return {
        ...(desk || { id: deskId, name: "Counter" }),
        isAssigned: assignedDeskIds.has(deskId),
        isAvailable: Boolean(desk),
      };
    });
  const counterInsights = counterActivityInsights(visibleDesks, submissions, member);
  const assignedServiceIds = new Set((Array.isArray(member?.serviceIds) ? member.serviceIds : []).map(String));
  const serviceById = new Map((Array.isArray(services) ? services : []).map((service) => [String(service.id), service]));
  const historicalServiceIds = allSubmissions
    .filter(
      (submission) => submission.status === "completed"
        && String(submission.servedByMemberId || "") === String(member?.id || "")
        && submission.serviceId != null,
    )
    .map((submission) => String(submission.serviceId));
  const visibleServices = Array.from(new Set([...assignedServiceIds, ...historicalServiceIds]))
    .map((serviceId) => {
      const service = serviceById.get(serviceId);
      return {
        ...(service || { id: serviceId, name: "Service" }),
        isAssigned: assignedServiceIds.has(serviceId),
        isAvailable: Boolean(service),
      };
    });
  const memberInsights = memberServiceInsights(member, visibleServices, submissions);
  const sharedServiceInsightsById = new Map(
    memberInsights.services.map((service) => [String(service.id), service]),
  );
  const counterServiceInsights = counterInsights.map((desk) => ({
    ...desk,
    services: memberServiceInsights(
      member,
      visibleServices,
      allSubmissions.filter(
        (submission) => String(submission.deskId ?? "") === String(desk.id),
      ),
    ).services.map((service) => {
      const sharedInsight = sharedServiceInsightsById.get(String(service.id));
      return sharedInsight
        ? {
            ...service,
            averageRating: sharedInsight.averageRating,
            ratingCount: sharedInsight.ratingCount,
            estimatedServiceMs: sharedInsight.estimatedServiceMs,
            durationSampleCount: sharedInsight.durationSampleCount,
          }
        : service;
    }),
  }));
  const hasPassword = Boolean(String(member?.password || "").trim());
  const viewingOwnProfile = Boolean(member && String(loggedInMember?.id || "") === String(member.id));
  const canViewPrivateDetails = Boolean(masterLoggedIn || viewingOwnProfile);
  const canEditProfile = Boolean(member && onUpdateMember && canViewPrivateDetails);
  const roleChip = roleChipState(member, labels.memberWord);
  const pageBgColor = mutedPageBackground(theme.bgColor, theme.accentColor);
  const toggleCounterServices = (deskId) => {
    setExpandedCounters((current) => ({
      ...current,
      [deskId]: !current[deskId],
    }));
  };

  useEffect(() => {
    setEditForm({
      name: member?.name || "",
      phone: member?.phone || "",
      email: member?.email || "",
      about: member?.about || "",
      photo: member?.photo || null,
    });
    setEditError("");
    if (!canEditProfile) setEditing(false);
  }, [canEditProfile, member?.about, member?.email, member?.id, member?.name, member?.phone, member?.photo]);

  const setEditValue = (key) => (value) => {
    setEditForm((current) => ({ ...current, [key]: value }));
    setEditError("");
  };

  const handleEditPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const photo = await readImageFile(file);
      setEditValue("photo")(photo);
    } catch (error) {
      setEditError(error.message || "Failed to upload photo.");
    }
  };

  const cancelEdit = () => {
    setEditForm({
      name: member?.name || "",
      phone: member?.phone || "",
      email: member?.email || "",
      about: member?.about || "",
      photo: member?.photo || null,
    });
    setEditError("");
    setEditing(false);
  };

  const saveProfileEdit = () => {
    const trimmedName = editForm.name.trim();
    const phoneDigits = editForm.phone.trim().replace(/\D/g, "");

    if (!trimmedName || !phoneDigits) {
      setEditError("Enter name and phone number to save.");
      return;
    }

    const patch = {
      name: trimmedName,
      phone: phoneDigits,
      email: editForm.email.trim(),
      about: editForm.about.trim(),
      photo: editForm.photo || null,
    };
    const result = onUpdateMember?.(member.id, patch);

    if (result?.ok === false) {
      setEditError(result.error === "duplicate-phone" ? "This phone number is already in use by another member." : "Could not save profile changes.");
      return;
    }

    setEditing(false);
    if (trimmedName !== member.name) {
      const nextMember = { ...member, ...patch };
      const nextMembers = members.map((item) => (String(item.id) === String(member.id) ? nextMember : item));
      onNavigate?.(getMemberProfilePath(nextMember, nextMembers));
    }
  };

  const handleThemeChange = (nextTheme) => {
    const currentMode = resolveThemeMode(theme.themeMode);
    const nextMode = resolveThemeMode(nextTheme);
    const themeColors = theme.themeColors || THEME_PRESETS;
    const currentColors = {
      ...(themeColors[currentMode] || THEME_PRESETS[currentMode]),
      accentColor: theme.accentColor,
      bgColor: theme.bgColor,
      fontColor: theme.fontColor,
      borderColor: theme.borderColor,
      separatorColor: theme.borderColor,
    };
    const nextColors = themeColors[nextMode] || THEME_PRESETS[nextMode] || THEME_PRESETS.Dark;

    onAppearanceChange?.({
      ...theme,
      themeMode: nextTheme,
      ...nextColors,
      themeColors: {
        ...themeColors,
        [currentMode]: currentColors,
        [nextMode]: nextColors,
      },
    });
  };

  return (
    <main className="flex min-h-screen w-full flex-col" style={{ backgroundColor: pageBgColor, color: theme.fontColor, "--surface-bg": theme.bgColor, "--page-bg": pageBgColor }}>
      <ProfileHeader
        member={member}
        loggedInMember={loggedInMember}
        masterLoggedIn={masterLoggedIn}
        members={members}
        theme={theme}
        notifications={notifications}
        onClearNotifications={onClearNotifications}
        onMarkNotificationsRead={onMarkNotificationsRead}
        subtitle={null}
        fullWidth
        backgroundColor={pageBgColor}
        onThemeChange={handleThemeChange}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <section className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-2.5 py-2.5 sm:px-6 sm:py-6">
        <div className="relative w-full max-w-3xl border p-4" style={{ borderColor: theme.borderColor, backgroundColor: "var(--surface-bg, transparent)", borderRadius: theme.radius * 1.4 }}>
          {loading || !member ? (
            <div className="py-16 text-center">
              <UserRound size={34} className="mx-auto" style={{ color: withAlpha(theme.fontColor, "70") }} />
              <h1 className="mt-4 text-xl font-semibold" style={{ color: theme.fontColor }}>
                {loading ? "Loading profile..." : "Profile not found"}
              </h1>
              <p className="mt-2 text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
                {loading ? "Fetching member details." : "This member profile link does not match an active member."}
              </p>
            </div>
          ) : (
            <>
              {canViewPrivateDetails ? (
                <>
                  {canEditProfile && !editing ? (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="absolute right-3 top-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                      style={{ backgroundColor: withAlpha(theme.fontColor, "12"), color: withAlpha(theme.fontColor, "b3") }}
                      aria-label="Edit profile"
                    >
                      <Pencil size={14} />
                    </button>
                  ) : null}
                  <div className="flex items-start gap-4">
                    <div className="flex w-20 shrink-0 flex-col items-center gap-2">
                      <div className="relative">
                        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}>
                          {(editing ? editForm.photo : member?.photo) ? (
                            <img src={editing ? editForm.photo : member.photo} alt={member.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xl font-semibold" style={{ color: theme.accentColor }}>
                              {initials(editing ? editForm.name : member?.name)}
                            </span>
                          )}
                        </div>
                        {editing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => (editForm.photo ? setEditValue("photo")(null) : photoInputRef.current?.click())}
                              className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors hover:bg-white/10"
                              style={{ color: theme.fontColor, borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
                              aria-label={editForm.photo ? "Remove photo" : "Upload photo"}
                              title={editForm.photo ? "Remove photo" : "Upload photo"}
                            >
                              {editForm.photo ? <X size={12} /> : <Upload size={12} />}
                            </button>
                            <input ref={photoInputRef} type="file" accept="image/*" onChange={handleEditPhoto} className="hidden" />
                          </>
                        ) : (
                          null
                        )}
                      </div>
                      <span
                        className="inline-flex max-w-[6.5rem] justify-center rounded-full px-2.5 py-1 text-center text-[11px] font-medium sm:text-xs"
                        style={{ color: roleChip.color, backgroundColor: `${roleChip.color}24` }}
                      >
                        <span className="truncate">{roleChip.label}</span>
                      </span>
                    </div>

                    <div className="min-w-0 pt-1">
                      {editing ? (
                        <div className="space-y-2">
                          <FormField label="Full Name" theme={theme}>
                            <TextInput value={editForm.name} onChange={setEditValue("name")} placeholder="Enter full name" theme={theme} />
                          </FormField>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <FormField label="Email" theme={theme}>
                              <TextInput value={editForm.email} onChange={setEditValue("email")} placeholder="Enter email" type="email" theme={theme} />
                            </FormField>
                            <FormField label="Phone" theme={theme}>
                              <TextInput value={editForm.phone} onChange={(value) => setEditValue("phone")(value.replace(/\D/g, "").slice(0, 15))} placeholder="Enter phone" inputMode="numeric" theme={theme} />
                            </FormField>
                          </div>
                          <FormField label="About" theme={theme}>
                            <TextInput value={editForm.about} onChange={setEditValue("about")} placeholder="Short note or specialization" theme={theme} />
                          </FormField>
                          {editError ? (
                            <p className="text-xs" style={{ color: "#f87171" }}>
                              {editError}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={saveProfileEdit}
                              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                              style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
                            >
                              <Check size={15} />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors hover:bg-white/5"
                              style={{ color: withAlpha(theme.fontColor, "cc"), borderColor: theme.borderColor, borderRadius: theme.radius }}
                            >
                              <X size={15} />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 pr-9">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase" style={{ color: theme.accentColor }}>
                                {member?.id}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <h1 className="break-words text-2xl font-semibold" style={{ color: theme.fontColor }}>
                                  {member?.name || "Member"}
                                </h1>
                                <RatingSummary average={memberInsights.averageRating} count={memberInsights.ratingCount} theme={theme} />
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-col gap-y-1.5 text-xs sm:text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
                            <span className="flex min-w-0 items-center gap-2">
                              <Mail size={13} className="shrink-0 sm:h-3.5 sm:w-3.5" style={{ color: withAlpha(theme.fontColor, "80") }} />
                              <span className="min-w-0 break-all">{member?.email || "-"}</span>
                            </span>
                            <span className="flex min-w-0 items-center gap-2">
                              <Phone size={13} className="shrink-0 sm:h-3.5 sm:w-3.5" style={{ color: withAlpha(theme.fontColor, "80") }} />
                              <span className="min-w-0">{member?.phone || "-"}</span>
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {!editing && member?.about ? (
                    <p className="mt-5 break-words text-sm leading-relaxed" style={{ color: withAlpha(theme.fontColor, "cc") }}>
                      {member.about}
                    </p>
                  ) : null}

                  {!editing ? <div className="mt-5 space-y-3">
                    <div className="flex w-full gap-2 text-xs font-medium sm:w-auto">
                      {[
                        { id: "counters", label: "Counters", icon: Monitor },
                        { id: "services", label: labels.serviceWordPlural, icon: Layers3 },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const active = profileTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setProfileTab(tab.id)}
                            className="flex min-h-9 flex-1 items-center justify-center gap-1.5 px-4 py-2 transition-colors sm:flex-none"
                            style={{
                              borderRadius: theme.radius * 1.2,
                              backgroundColor: active ? withAlpha(theme.accentColor, "18") : "transparent",
                              color: active ? theme.accentColor : withAlpha(theme.fontColor, "75"),
                            }}
                            aria-pressed={active}
                          >
                            <Icon size={14} className="shrink-0" />
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="min-w-0 text-sm" style={{ color: theme.fontColor }}>
                      {profileTab === "counters" ? (
                      <div className="w-full space-y-2.5">
                          {counterServiceInsights.length ? (
                            counterServiceInsights.map((desk) => {
                              const deskPath = desk.isAvailable ? getDeskPath(desk, desks) : "";
                              const servicesExpanded = Boolean(expandedCounters[desk.id]);
                              const counterNameColor = desk.isAssigned ? theme.fontColor : withAlpha(theme.fontColor, "70");
                              const statusState = counterStatusState(desk);
                              const StatusIcon = statusState.Icon;
                              const statusIconColor = desk.isAssigned ? statusState.color : withAlpha(statusState.color, "80");
                              const counterStats = desk.isAssigned
                                ? [
                                    { label: "Waiting", value: desk.waitingCount, color: theme.accentColor },
                                    { label: "Absent", value: desk.absentCount, color: "#f59e0b" },
                                    { label: "Served", value: desk.servedCount, color: "#22c55e" },
                                  ]
                                : [
                                    { label: "Served", value: desk.servedCount, color: "#22c55e" },
                                  ];
                              return (
                                <div
                                  key={desk.id}
                                  className="block w-full border px-2.5 py-3 sm:p-3"
                                  style={profileCardStyle(theme)}
                                >
                                  <span className={`grid w-full items-center gap-x-2 gap-y-2 ${desk.isAssigned ? "grid-cols-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(2.75rem,auto))]" : "grid-cols-[minmax(0,1fr)_minmax(2.75rem,auto)]"}`}>
                                    {desk.isAvailable ? (
                                      <a
                                        href={deskPath}
                                        onClick={(event) => {
                                          event.preventDefault();
                                          onNavigate?.(deskPath);
                                        }}
                                        className={`${desk.isAssigned ? "col-span-3 sm:col-span-1" : ""} inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 transition-opacity hover:opacity-80 sm:gap-2`}
                                      >
                                        <StatusIcon size={15} className="shrink-0 sm:h-4 sm:w-4" style={{ color: statusIconColor }} />
                                        <span className="block min-w-0 break-words text-sm font-semibold leading-tight sm:truncate sm:text-base" style={{ color: counterNameColor }}>
                                          {counterDisplayName(desk.name)}
                                        </span>
                                        <span className="inline-flex h-[1em] w-[1em] shrink-0 -translate-y-px items-center justify-center">
                                          <ExternalLink size={13} style={{ color: withAlpha(theme.fontColor, "99") }} />
                                        </span>
                                      </a>
                                    ) : (
                                      <span className={`${desk.isAssigned ? "col-span-3 sm:col-span-1" : ""} inline-flex w-fit max-w-full min-w-0 items-center gap-1.5 sm:gap-2`}>
                                      <StatusIcon size={15} className="shrink-0 sm:h-4 sm:w-4" style={{ color: statusIconColor }} />
                                      <span className="block min-w-0 break-words text-sm font-semibold leading-tight sm:truncate sm:text-base" style={{ color: counterNameColor }}>
                                        {counterDisplayName(desk.name)}
                                      </span>
                                      </span>
                                    )}
                                    {counterStats.map((stat) => (
                                      <button
                                        key={stat.label}
                                        type="button"
                                        onClick={() => toggleCounterServices(desk.id)}
                                        className="min-w-0 text-center transition-opacity hover:opacity-80"
                                        aria-expanded={servicesExpanded}
                                        aria-controls={`counter-services-${desk.id}`}
                                        aria-label={`${stat.label} ${stat.value}, ${servicesExpanded ? "hide" : "show"} services`}
                                      >
                                        <span className="block text-base font-semibold leading-none sm:text-lg" style={{ color: stat.color }}>
                                          {stat.value}
                                        </span>
                                        <span className="mt-1 block text-[9px] leading-none sm:text-[10px]" style={{ color: withAlpha(theme.fontColor, "70") }}>
                                          {stat.label}
                                        </span>
                                      </button>
                                    ))}
                                  </span>
                                  {servicesExpanded ? (
                                    <span id={`counter-services-${desk.id}`} className="mt-4 block w-full">
                                      {desk.services.length ? (
                                        desk.services.map((service, serviceIndex) => (
                                          <span
                                            key={service.id}
                                            className={`grid w-full items-center gap-x-2 gap-y-2.5 py-4 first:pt-0 last:pb-0 ${desk.isAssigned && service.isAssigned ? "grid-cols-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(2.75rem,auto))]" : "grid-cols-[minmax(0,1fr)_minmax(2.75rem,auto)]"}`}
                                            style={{ borderTop: serviceIndex ? `1px solid ${withAlpha(theme.borderColor, "66")}` : undefined }}
                                          >
                                            <span className={`${desk.isAssigned && service.isAssigned ? "col-span-3 sm:col-span-1" : ""} min-w-0`}>
                                              <span className="block break-words font-medium" style={{ color: service.isAssigned ? theme.fontColor : withAlpha(theme.fontColor, "70") }}>{service.name}</span>
                                            </span>
                                            {(desk.isAssigned && service.isAssigned
                                              ? [
                                                  { label: "waiting", value: service.waitingCount, color: theme.accentColor },
                                                  { label: "absent", value: service.absentCount, color: "#f59e0b" },
                                                  { label: "served", value: service.servedCount, color: "#22c55e" },
                                                ]
                                              : [
                                                  { label: "served", value: service.servedCount, color: "#22c55e" },
                                                ]).map((stat) => (
                                              <span key={stat.label} className="min-w-0 text-center" aria-label={`${service.name} ${stat.value} ${stat.label}`}>
                                                <span className="block text-base font-semibold leading-none sm:text-lg" style={{ color: stat.color }}>
                                                  {stat.value}
                                                </span>
                                              </span>
                                            ))}
                                          </span>
                                        ))
                                      ) : (
                                        <span className="mt-0.5 block break-words font-medium">-</span>
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                              );
                            })
                          ) : (
                            <p className="mt-0.5 break-words font-medium">-</p>
                          )}
                      </div>
                      ) : (
                        <div className="w-full space-y-2.5">
                          {memberInsights.services.length ? (
                            memberInsights.services.map((service) => {
                              const serviceStats = service.isAssigned
                                ? [
                                    { label: "Waiting", value: service.waitingCount, color: theme.accentColor },
                                    { label: "Absent", value: service.absentCount, color: "#f59e0b" },
                                    { label: "Served", value: service.servedCount, color: "#22c55e" },
                                  ]
                                : [
                                    { label: "Served", value: service.servedCount, color: "#22c55e" },
                                  ];
                              return (
                              <div
                                key={service.id}
                                className={`grid w-full items-center gap-x-2 gap-y-2.5 border px-2.5 py-3 sm:p-3 ${service.isAssigned ? "grid-cols-3 sm:grid-cols-[minmax(0,1fr)_repeat(3,minmax(2.75rem,auto))]" : "grid-cols-[minmax(0,1fr)_minmax(2.75rem,auto)]"}`}
                                style={profileCardStyle(theme)}
                              >
                                <span className={`${service.isAssigned ? "col-span-3 sm:col-span-1" : ""} min-w-0`}>
                                  <span className="block break-words font-medium" style={{ color: service.isAssigned ? theme.fontColor : withAlpha(theme.fontColor, "70") }}>{service.name}</span>
                                  <span className="mt-2 flex min-w-0 items-center gap-3 text-xs font-normal" style={{ color: withAlpha(theme.fontColor, "80") }}>
                                    <RatingSummary average={service.averageRating} count={service.ratingCount} theme={theme} compact />
                                    <span className="flex min-w-0 items-center gap-1 truncate">
                                      <Clock3 size={12} className="shrink-0" />
                                      <span className="truncate">{formatEstimatedServiceTime(service.estimatedServiceMs)}</span>
                                    </span>
                                  </span>
                                </span>
                                {serviceStats.map((stat) => (
                                  <span key={stat.label} className="min-w-0 text-center" aria-label={`${service.name} ${stat.value} ${stat.label.toLowerCase()}`}>
                                    <span className="block text-base font-semibold leading-none sm:text-lg" style={{ color: stat.color }}>
                                      {stat.value}
                                    </span>
                                    <span className="mt-1 block text-[9px] leading-none sm:text-[10px]" style={{ color: withAlpha(theme.fontColor, "70") }}>
                                      {stat.label}
                                    </span>
                                  </span>
                                ))}
                              </div>
                              );
                            })
                          ) : (
                            <p className="mt-0.5 break-words font-medium">-</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div> : null}
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border" style={{ borderColor: theme.borderColor, backgroundColor: withAlpha(theme.accentColor, "1f") }}>
                    {member?.photo ? (
                      <img src={member.photo} alt={member.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold" style={{ color: theme.accentColor }}>
                        {initials(member?.name)}
                      </span>
                    )}
                  </div>
                  <h1 className="mt-5 break-words text-2xl font-semibold" style={{ color: theme.fontColor }}>
                    {member?.name || "Member"}
                  </h1>
                  <p className="mt-1 text-sm" style={{ color: withAlpha(theme.fontColor, "80") }}>
                    Sign in to access this account.
                  </p>
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={() => onNavigate?.(hasPassword ? `/login?member=${encodeURIComponent(member.id)}` : `/create-password?member=${encodeURIComponent(member.id)}`)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: theme.accentColor, borderRadius: theme.radius }}
                    >
                      {hasPassword ? <LogIn size={15} /> : <KeyRound size={15} />}
                      {hasPassword ? "Login" : "Create password"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
