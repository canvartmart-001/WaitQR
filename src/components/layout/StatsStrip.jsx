import { Clock, Monitor, TrendingUp, UserCheck } from "lucide-react";
import { C } from "../../lib/theme";

function withAlpha(hex, alphaHex) {
  if (!hex || hex.length !== 7) return hex;
  return `${hex}${alphaHex}`;
}

export function StatsStrip({ joinedToday, totalServed, servedDeskCount, servedDeskLabel, waitingNow, theme }) {
  const palette = theme || {
    accentColor: C.amber,
    fontColor: C.textLight,
    borderColor: C.hair,
    radius: 16,
  };
  const stats = [
    { label: "Total Joined", value: joinedToday, icon: TrendingUp, color: palette.accentColor },
    { label: totalServed === 1 ? "Served Ticket" : "Served Tickets", value: totalServed, icon: UserCheck, color: C.teal },
    { label: "Waiting Now", value: waitingNow, icon: Clock, color: C.amber },
    { label: servedDeskLabel, value: servedDeskCount, icon: Monitor, color: C.teal },
  ];

  return (
    <div className="px-2.5 py-2.5 sm:px-6 sm:py-6 md:pl-10 md:pr-6">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex min-w-0 items-center gap-3 border bg-white/5 p-4"
            style={{ borderColor: palette.borderColor, borderRadius: palette.radius * 1.2 }}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: withAlpha(s.color, "1f") }}>
              <s.icon size={16} style={{ color: s.color }} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[10px] uppercase tracking-wider" style={{ color: withAlpha(palette.fontColor, "80") }}>
                {s.label}
              </div>
              <div className="qp-mono text-xl font-semibold" style={{ color: palette.fontColor }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
