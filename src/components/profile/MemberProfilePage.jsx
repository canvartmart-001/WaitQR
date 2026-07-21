import { BriefcaseBusiness, Check, KeyRound, LayoutDashboard, LogIn, LogOut, Mail, Pencil, Phone, Monitor, Moon, Sun, Upload, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readImageFile } from "../../lib/imageUpload";
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

function namesForIds(items, ids) {
  const selected = new Set((Array.isArray(ids) ? ids : []).map(String));
  return (Array.isArray(items) ? items : [])
    .filter((item) => selected.has(String(item.id)))
    .map((item) => item.name);
}

function itemsForIds(items, ids) {
  const selected = new Set((Array.isArray(ids) ? ids : []).map(String));
  return (Array.isArray(items) ? items : []).filter((item) => selected.has(String(item.id)));
}

function counterDisplayName(name) {
  const text = String(name || "").trim();
  if (!text) return "Counter";
  return text.replace(/^desk\b/i, "Counter");
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
    <div className="relative" ref={ref}>
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
        <div className="absolute right-0 top-full z-30 mt-2 w-36 overflow-hidden border py-1 shadow-xl" style={{ backgroundColor: theme.bgColor, borderColor: theme.borderColor, borderRadius: theme.radius }}>
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

export function ProfileHeader({ member, loggedInMember, masterLoggedIn, members, theme, notifications = [], onClearNotifications, subtitle = "Member profile", onThemeChange, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const activeMember = loggedInMember || null;
  const signedIn = Boolean(activeMember || masterLoggedIn);
  const canVisitDashboard = Boolean(masterLoggedIn || activeMember?.role === "Administrator");
  const displayName = activeMember?.name || (masterLoggedIn ? "Development Access" : "Account");
  const displayRole = activeMember ? displayRoleName(activeMember.role) : masterLoggedIn ? "Master login" : "Login required";
  const logoUrl = theme.logoUrl;
  const systemName = theme.systemName || "WaitQR";

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
    <header className="sticky top-0 z-20 w-full px-2.5 py-2.5 sm:px-6 sm:py-5" style={{ backgroundColor: theme.bgColor }}>
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <button type="button" onClick={() => onNavigate?.("/")} className="flex min-w-0 items-center gap-2 text-left">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden text-sm font-semibold text-white"
            style={{ backgroundColor: logoUrl ? "transparent" : theme.accentColor, borderRadius: theme.radius }}
          >
            {logoUrl ? <img src={logoUrl} alt={`${systemName} logo`} className="h-full w-full object-cover" /> : systemName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-semibold" style={{ color: theme.fontColor }}>
              {systemName}
            </span>
            <span className="hidden text-xs sm:block" style={{ color: withAlpha(theme.fontColor, "80") }}>
              {subtitle}
            </span>
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
          {signedIn ? <NotificationMenu notifications={notifications} theme={theme} onClear={onClearNotifications} /> : null}

          <div className="relative" ref={ref}>
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
              <div className="absolute right-0 top-full mt-2 w-48 overflow-hidden border py-1 shadow-xl" style={{ backgroundColor: theme.bgColor, borderColor: theme.borderColor, borderRadius: theme.radius }}>
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

export function MemberProfilePage({ member, desks, services, labels, theme, loading = false, loggedInMember, masterLoggedIn = false, members = [], notifications = [], onClearNotifications, onAppearanceChange, onUpdateMember, onLogout, onNavigate }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", phone: "", email: "", about: "", photo: null });
  const [editError, setEditError] = useState("");
  const photoInputRef = useRef(null);
  const assignedDesks = itemsForIds(desks, member?.deskIds);
  const assignedServiceNames = namesForIds(services, member?.serviceIds);
  const hasPassword = Boolean(String(member?.password || "").trim());
  const viewingOwnProfile = Boolean(member && String(loggedInMember?.id || "") === String(member.id));
  const canViewPrivateDetails = Boolean(masterLoggedIn || viewingOwnProfile);
  const canEditProfile = Boolean(member && onUpdateMember && canViewPrivateDetails);
  const roleChip = roleChipState(member, labels.memberWord);

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
      separatorColor: theme.separatorColor,
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
    <main className="flex min-h-screen w-full flex-col" style={{ backgroundColor: theme.bgColor, color: theme.fontColor }}>
      <ProfileHeader
        member={member}
        loggedInMember={loggedInMember}
        masterLoggedIn={masterLoggedIn}
        members={members}
        theme={theme}
        notifications={notifications}
        onClearNotifications={onClearNotifications}
        onThemeChange={handleThemeChange}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />
      <section className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-2.5 py-2.5 sm:px-6 sm:py-6">
        <div className="relative w-full max-w-xl border bg-white/5 p-4" style={{ borderColor: theme.borderColor, borderRadius: theme.radius * 1.4 }}>
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
                              <h1 className="mt-1 break-words text-2xl font-semibold" style={{ color: theme.fontColor }}>
                                {member?.name || "Member"}
                              </h1>
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

                  {!editing ? <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: withAlpha(theme.borderColor, "55") }}>
                    <div className="flex min-w-0 items-start gap-2 text-sm" style={{ color: theme.fontColor }}>
                      <BriefcaseBusiness size={15} className="mt-0.5 shrink-0" style={{ color: theme.accentColor }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase" style={{ color: withAlpha(theme.fontColor, "70") }}>
                          Counters
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {assignedDesks.length ? (
                            assignedDesks.map((desk) => {
                              const deskPath = getDeskPath(desk, desks);
                              return (
                                <a
                                  key={desk.id}
                                  href={deskPath}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    onNavigate?.(deskPath);
                                  }}
                                  className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium transition-opacity hover:opacity-80"
                                  style={{ color: theme.accentColor, backgroundColor: withAlpha(theme.accentColor, "14") }}
                                >
                                  {counterDisplayName(desk.name)}
                                </a>
                              );
                            })
                          ) : (
                            <p className="mt-0.5 break-words font-medium">-</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-2 text-sm" style={{ color: theme.fontColor }}>
                      <UserRound size={15} className="mt-0.5 shrink-0" style={{ color: theme.accentColor }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase" style={{ color: withAlpha(theme.fontColor, "70") }}>
                          {labels.serviceWordPlural}
                        </p>
                        <p className="mt-0.5 break-words font-medium">{assignedServiceNames.join(", ") || "-"}</p>
                      </div>
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
