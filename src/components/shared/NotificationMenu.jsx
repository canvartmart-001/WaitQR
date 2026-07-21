import { Bell, CalendarClock, CheckCircle2, ChevronDown, X, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

function StatusIcon({ mode, color }) {
  if (mode === "scheduled") return <CalendarClock size={15} style={{ color }} />;
  if (mode === "closed") return <XCircle size={15} style={{ color }} />;
  return <CheckCircle2 size={15} style={{ color }} />;
}

function formatTime(value) {
  const time = Number(value);
  if (!Number.isFinite(time)) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(time));
}

export function NotificationMenu({ notifications = [], theme, align = "right", onClear, onMarkRead }) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const ref = useRef(null);
  const clickedIdsRef = useRef(new Set());
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const totalCount = notifications.length;
  const bgColor = theme?.bgColor || "#04060b";
  const fontColor = theme?.fontColor || "#e2e8f0";
  const borderColor = theme?.borderColor || "#171d2b";
  const radius = theme?.radius || 12;

  const closeMenu = () => {
    if (onMarkRead && clickedIdsRef.current.size) {
      onMarkRead(Array.from(clickedIdsRef.current));
      clickedIdsRef.current.clear();
    }

    setOpen(false);
    setExpandedId("");
  };

  useEffect(() => {
    const handleClick = (event) => {
      if (ref.current && !ref.current.contains(event.target)) closeMenu();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, notifications]);

  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={`Notifications, ${unreadCount} unread, ${totalCount} total`}
        aria-expanded={open}
        onClick={() => {
          if (open) closeMenu();
          else setOpen(true);
        }}
        className="relative rounded-full p-2 transition-colors hover:bg-white/5"
        style={{ color: withAlpha(fontColor, "99") }}
      >
        <Bell size={18} />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden border-0 shadow-2xl sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:h-auto sm:w-[min(20rem,calc(100vw-1.25rem))] sm:border ${align === "left" ? "sm:left-0" : "sm:right-0"} rounded-none sm:rounded-[var(--menu-radius)]`}
          style={{ "--menu-radius": `${radius}px`, backgroundColor: bgColor, borderColor }}
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-3 sm:py-2" style={{ borderColor: withAlpha(borderColor, "88") }}>
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: fontColor }}>
                Notifications
              </p>
              {unreadCount ? (
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none"
                  style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
                >
                  {unreadCount} unread
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {notifications.length ? (
                <button type="button" onClick={onClear} className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: withAlpha(fontColor, "a6") }}>
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={closeMenu}
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/5 sm:h-7 sm:w-7"
                style={{ color: withAlpha(fontColor, "b3") }}
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto py-1 sm:max-h-80 sm:flex-none">
            {notifications.length ? (
              notifications.map((item) => {
                const read = Boolean(item.readAt);
                const events = Array.isArray(item.events) && item.events.length ? item.events : [item];
                const expanded = expandedId === item.id;
                return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    if (!read) clickedIdsRef.current.add(item.id);
                    setExpandedId((value) => (value === item.id ? "" : item.id));
                  }}
                  className="flex w-full gap-3 px-4 py-3 text-left transition-opacity hover:bg-white/5 sm:gap-2.5 sm:px-3 sm:py-2.5"
                  style={{
                    opacity: read ? 0.62 : 1,
                  }}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}${read ? "14" : "1f"}` }}>
                    <StatusIcon mode={item.mode} color={item.color} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm leading-snug" style={{ color: fontColor, fontWeight: read ? 500 : 700 }}>
                          {item.counterName || item.title}
                        </span>
                        <span className="mt-0.5 block text-xs leading-snug" style={{ color: withAlpha(fontColor, "99") }}>
                          {item.message}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {events.length > 1 ? (
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none" style={{ backgroundColor: withAlpha(fontColor, "10"), color: withAlpha(fontColor, "8f") }}>
                            {events.length}
                          </span>
                        ) : null}
                        <ChevronDown size={15} style={{ color: withAlpha(fontColor, "73"), transform: expanded ? "rotate(180deg)" : "none", transition: "transform 120ms ease" }} />
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px]" style={{ color: withAlpha(fontColor, "73") }}>
                      {formatTime(item.time)}
                    </span>
                    {expanded ? (
                      <span className="mt-3 block border-t pt-2" style={{ borderColor: withAlpha(borderColor, "88") }}>
                        {events.map((event, index) => (
                          <span key={event.id} className="grid grid-cols-[2.55rem_1.1rem_minmax(0,1fr)] gap-1.5">
                            <span className="pt-0.5 text-right text-[11px]" style={{ color: withAlpha(fontColor, "73") }}>
                              {formatTime(event.time)}
                            </span>
                            <span className="relative flex justify-center">
                              {index < events.length - 1 ? (
                                <span className="absolute bottom-0 top-5 w-px" style={{ backgroundColor: withAlpha(borderColor, "cc") }} />
                              ) : null}
                              <span className="relative z-10 flex h-5 w-5 items-center justify-center rounded-full" style={{ backgroundColor: `${event.color}1a` }}>
                                <StatusIcon mode={event.mode} color={event.color} />
                              </span>
                            </span>
                            <span className="min-w-0 pb-3">
                              <span className="block text-xs font-medium leading-snug" style={{ color: fontColor }}>
                                {event.title}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: withAlpha(fontColor, "8f") }}>
                                {event.message}
                              </span>
                            </span>
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                </button>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center text-sm" style={{ color: withAlpha(fontColor, "88") }}>
                No counter updates yet.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
