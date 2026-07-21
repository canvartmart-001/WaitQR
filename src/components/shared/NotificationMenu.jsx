import { Bell, CalendarClock, CheckCircle2, X, XCircle } from "lucide-react";
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

export function NotificationMenu({ notifications = [], theme, align = "right", onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.length > 0;
  const bgColor = theme?.bgColor || "#04060b";
  const fontColor = theme?.fontColor || "#e2e8f0";
  const borderColor = theme?.borderColor || "#171d2b";
  const radius = theme?.radius || 12;

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
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 transition-colors hover:bg-white/5"
        style={{ color: withAlpha(fontColor, "99") }}
      >
        <Bell size={18} />
        {unread ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /> : null}
      </button>

      {open ? (
        <div
          className={`fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden border-0 shadow-2xl sm:absolute sm:inset-auto sm:top-full sm:mt-2 sm:h-auto sm:w-[min(20rem,calc(100vw-1.25rem))] sm:border ${align === "left" ? "sm:left-0" : "sm:right-0"} rounded-none sm:rounded-[var(--menu-radius)]`}
          style={{ "--menu-radius": `${radius}px`, backgroundColor: bgColor, borderColor }}
        >
          <div className="flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-3 sm:py-2" style={{ borderColor: withAlpha(borderColor, "88") }}>
            <p className="text-sm font-semibold" style={{ color: fontColor }}>
              Notifications
            </p>
            <div className="flex items-center gap-3">
              {notifications.length ? (
                <button type="button" onClick={onClear} className="text-xs font-medium transition-colors hover:opacity-80" style={{ color: withAlpha(fontColor, "a6") }}>
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setOpen(false)}
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
              notifications.map((item) => (
                <div key={item.id} className="flex gap-3 px-4 py-3 sm:gap-2.5 sm:px-3 sm:py-2.5">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}1f` }}>
                    <StatusIcon mode={item.mode} color={item.color} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug" style={{ color: fontColor }}>
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug" style={{ color: withAlpha(fontColor, "99") }}>
                      {item.message}
                    </span>
                    <span className="mt-1 block text-[11px]" style={{ color: withAlpha(fontColor, "73") }}>
                      {formatTime(item.time)}
                    </span>
                  </span>
                </div>
              ))
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
