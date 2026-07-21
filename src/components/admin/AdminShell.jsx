import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Monitor,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { ADMIN_NAV_ITEMS, ADMIN_PAGE_META } from "./adminNavigation";
import { getMemberProfilePath } from "../../lib/routing";
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

function pickThemeColors(appearance) {
  return {
    accentColor: appearance.accentColor,
    bgColor: appearance.bgColor,
    fontColor: appearance.fontColor,
    borderColor: appearance.borderColor,
    separatorColor: appearance.separatorColor,
  };
}

function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD";
}

function displayRoleName(role, fallback = "Member") {
  const value = String(role || fallback).trim();
  return value === "Administrator" ? "Admin" : value;
}

function ThemeSwitch({ theme, onChange, accent, fontColor, borderColor, bgColor, radius }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const options = [
    { value: "Light", icon: Sun, label: "Light" },
    { value: "Dark", icon: Moon, label: "Dark" },
    { value: "System", icon: Monitor, label: "System" },
  ];
  const Current = options.find((option) => option.value === theme)?.icon || Monitor;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Change theme"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-white/5"
        style={{ color: withAlpha(fontColor, "99") }}
      >
        <Current size={18} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden border py-1 shadow-lg"
          style={{ backgroundColor: bgColor, borderColor, borderRadius: radius }}
        >
          {options.map(({ value, icon: Icon, label }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                style={{ color: active ? accent : fontColor }}
              >
                <Icon size={15} />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ member, masterLoggedIn, accentColor, fontColor, borderColor, bgColor, radius, onProfile, onLogin, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const displayName = member?.name || (masterLoggedIn ? "Development Access" : "Account");
  const displayRole = member ? displayRoleName(member.role) : masterLoggedIn ? "Master login" : "Login required";
  const avatarText = initials(member?.name);

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
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Open profile menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full transition-colors hover:bg-white/5"
        style={{ color: withAlpha(fontColor, "99") }}
      >
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-sm font-semibold text-white">
          {member?.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : member ? avatarText : masterLoggedIn ? "DEV" : <UserRound size={17} />}
        </span>
        <span className="hidden text-left text-sm md:block">
          <span className="block font-medium" style={{ color: fontColor }}>
            {displayName}
          </span>
          <span className="block text-xs" style={{ color: withAlpha(fontColor, "80") }}>
            {displayRole}
          </span>
        </span>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-2 w-40 overflow-hidden border py-1 shadow-lg"
          style={{ backgroundColor: bgColor, borderColor, borderRadius: radius }}
        >
          {member || masterLoggedIn ? (
            <>
              {member ? (
                <button
                  type="button"
                  onClick={() => handleAction(onProfile)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                  style={{ color: fontColor }}
                >
                  <UserRound size={15} />
                  Profile
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleAction(onLogout)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
                style={{ color: fontColor }}
              >
                <LogOut size={15} />
                Logout
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleAction(onLogin)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-white/5"
              style={{ color: accentColor }}
            >
              <UserRound size={15} />
              Login
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Sidebar({ variant, open, onClose, currentPage, onNavigate, theme, collapsed, onToggleCollapse }) {
  const { accentColor, fontColor, bgColor, radius, logoUrl } = theme;
  const isCollapsed = variant === "desktop" && collapsed;

  const handleNavClick = (item) => {
    if (item.path) onNavigate(item.path);
    if (variant === "mobile") onClose?.();
  };

  const content = (
    <>
      <div className={`mb-6 flex items-center px-2 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="flex min-w-0 items-center gap-2 text-xl font-bold"
          style={{ color: fontColor }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden text-sm text-white"
            style={{ backgroundColor: logoUrl ? "transparent" : accentColor, borderRadius: radius }}
          >
            {logoUrl ? <img src={logoUrl} alt="WaitQR logo" className="h-full w-full object-cover" /> : "W"}
          </span>
          {!isCollapsed && <span className="truncate">WaitQR</span>}
        </button>

        {variant === "mobile" && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "99") }}
          >
            <X size={18} />
          </button>
        )}

        {variant === "desktop" && !isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/5"
            style={{ color: withAlpha(fontColor, "80") }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {variant === "desktop" && isCollapsed && (
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="mb-2 flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full transition-colors hover:bg-white/5"
          style={{ color: withAlpha(fontColor, "80") }}
        >
          <ChevronRight size={16} />
        </button>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden">
        {ADMIN_NAV_ITEMS.map(({ label, icon: Icon, path, page }) => {
          const active = page && currentPage === page;
          return (
            <button
              key={label}
              type="button"
              onClick={() => handleNavClick({ path })}
              title={isCollapsed ? label : undefined}
              aria-label={label}
              className={`relative flex w-full items-center gap-3 py-2 text-sm transition-colors hover:bg-white/5 ${
                isCollapsed ? "justify-center px-0" : "px-3"
              }`}
              style={{
                borderRadius: radius,
                cursor: path ? "pointer" : "default",
                ...(active
                  ? { backgroundColor: withAlpha(accentColor, "1f"), color: accentColor }
                  : { color: withAlpha(fontColor, path ? "99" : "55") }),
              }}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" style={{ backgroundColor: accentColor }} />
              )}
              <Icon size={17} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        title={isCollapsed ? "Logout" : undefined}
        aria-label="Logout"
        className={`mt-4 flex items-center gap-3 py-2 text-sm hover:bg-white/5 ${isCollapsed ? "justify-center px-0" : "px-3"}`}
        style={{ color: withAlpha(fontColor, "99"), borderRadius: radius }}
      >
        <LogOut size={17} className="shrink-0" />
        {!isCollapsed && "Logout"}
      </button>
    </>
  );

  if (variant === "mobile") {
    return (
      <div className={`fixed inset-0 z-40 md:hidden ${open ? "" : "pointer-events-none"}`}>
        <aside
          className="absolute inset-0 flex h-full w-full flex-col p-4 transition-transform duration-200"
          style={{
            backgroundColor: bgColor,
            transform: open ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {content}
        </aside>
      </div>
    );
  }

  return (
    <aside
      className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden p-3 transition-[width] duration-200 md:flex"
      style={{ backgroundColor: bgColor, width: isCollapsed ? 64 : 220 }}
    >
      {content}
    </aside>
  );
}

export function AdminShell({ currentPage, children, onNavigate, appearance, onAppearanceChange, onThemeChange, loggedInMember, masterLoggedIn = false, members = [], notifications = [], onClearNotifications, onMarkNotificationsRead, onLogoutMember }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const {
    accentColor = "#2563eb",
    bgColor = "#04060b",
    fontColor = "#e2e8f0",
    borderColor = "#171d2b",
    separatorColor = "#171d2b",
    radius = 12,
    logoUrl = null,
    themeMode = "Dark",
    currency = "USD",
    themeColors = THEME_PRESETS,
    systemName = "WaitQR",
  } = appearance || {};

  const updateAppearance = (patch) => onAppearanceChange?.({ ...(appearance || {}), ...patch });
  const currentMode = resolveThemeMode(themeMode);
  const updateCurrentThemeColors = (patch) => {
    const nextColors = {
      ...(themeColors[currentMode] || THEME_PRESETS[currentMode]),
      ...pickThemeColors({ accentColor, bgColor, fontColor, borderColor, separatorColor }),
      ...patch,
    };
    updateAppearance({
      ...patch,
      themeColors: {
        ...themeColors,
        [currentMode]: nextColors,
      },
    });
  };

  const handleThemeChange = (nextTheme) => {
    const currentColors = {
      ...(themeColors[currentMode] || THEME_PRESETS[currentMode]),
      ...pickThemeColors({ accentColor, bgColor, fontColor, borderColor, separatorColor }),
    };
    const nextMode = resolveThemeMode(nextTheme);
    const nextColors = themeColors[nextMode] || THEME_PRESETS[nextMode] || THEME_PRESETS.Dark;
    updateAppearance({
      themeMode: nextTheme,
      ...nextColors,
      themeColors: {
        ...themeColors,
        [currentMode]: currentColors,
        [nextMode]: nextColors,
      },
    });
  };

  const theme = {
    setAppearance: (value) => onAppearanceChange?.(value),
    systemName,
    setSystemName: (value) => updateAppearance({ systemName: value }),
    accentColor,
    setAccentColor: (value) => updateCurrentThemeColors({ accentColor: value }),
    bgColor,
    setBgColor: (value) => updateCurrentThemeColors({ bgColor: value }),
    fontColor,
    setFontColor: (value) => updateCurrentThemeColors({ fontColor: value }),
    borderColor,
    setBorderColor: (value) => updateCurrentThemeColors({ borderColor: value }),
    separatorColor,
    setSeparatorColor: (value) => updateCurrentThemeColors({ separatorColor: value }),
    radius,
    setRadius: (value) => updateAppearance({ radius: value }),
    logoUrl,
    setLogoUrl: (value) => updateAppearance({ logoUrl: value }),
    setThemeColors: (value) => updateAppearance({ themeColors: value }),
    themeMode,
    currency,
    setCurrency: (value) => updateAppearance({ currency: value }),
    handleThemeChange,
  };
  const meta = ADMIN_PAGE_META[currentPage] || ADMIN_PAGE_META.dashboard;
  const PageIcon = meta.icon;
  const content = typeof children === "function" ? children(theme) : children;

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: bgColor, color: fontColor }}>
      <Sidebar
        variant="desktop"
        currentPage={currentPage}
        onNavigate={onNavigate}
        theme={theme}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
      />
      <Sidebar
        variant="mobile"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
        theme={theme}
      />

      <main className="min-w-0 flex-1">
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 px-2.5 py-2.5 sm:px-6 sm:py-5 md:pl-10 md:pr-6"
          style={{ backgroundColor: bgColor }}
        >
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen((value) => !value)}
              aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
              className="flex items-center gap-1.5 rounded-md md:pointer-events-none"
            >
              <PageIcon size={18} className="shrink-0 md:hidden" style={{ color: accentColor }} />
              <h1 className="truncate text-lg font-bold sm:text-xl" style={{ color: fontColor }}>
                {meta.title}
              </h1>
              <ChevronRight
                size={16}
                className="shrink-0 transition-transform md:hidden"
                style={{ color: withAlpha(fontColor, "80"), transform: mobileNavOpen ? "rotate(90deg)" : "none" }}
              />
            </button>
            <p className="mt-0.5 hidden text-sm sm:block" style={{ color: withAlpha(fontColor, "80") }}>
              {meta.subtitle}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <ThemeSwitch
              theme={themeMode}
              onChange={onThemeChange || handleThemeChange}
              accent={accentColor}
              fontColor={fontColor}
              borderColor={borderColor}
              bgColor={bgColor}
              radius={radius}
            />
            <NotificationMenu notifications={notifications} theme={{ bgColor, fontColor, borderColor, radius }} onClear={onClearNotifications} onMarkRead={onMarkNotificationsRead} />
            <ProfileMenu
              member={loggedInMember}
              masterLoggedIn={masterLoggedIn}
              accentColor={accentColor}
              fontColor={fontColor}
              borderColor={borderColor}
              bgColor={bgColor}
              radius={radius}
              onProfile={() => onNavigate(loggedInMember ? getMemberProfilePath(loggedInMember, members) : "/login")}
              onLogin={() => onNavigate("/login")}
              onLogout={onLogoutMember}
            />
          </div>
        </div>

        {content}
      </main>
    </div>
  );
}
