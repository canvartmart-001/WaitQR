import { C } from "../../lib/theme";
import { Check, MinusCircle, X } from "lucide-react";

function withAlpha(hex, alphaHex) {
  if (typeof hex !== "string" || !/^#?[0-9a-f]{6}$/i.test(hex)) return hex;
  return `${hex.startsWith("#") ? hex : `#${hex}`}${alphaHex}`;
}

export function ServiceTab({ selectedDesk, services = [], servedByDeskService = {}, absentByDeskService = {}, removedByDeskService = {}, serviceWordPluralLower = "services", theme }) {
  const surfaceTheme = {
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink700,
    radius: theme?.radius || 8,
  };
  const faintColor = withAlpha(surfaceTheme.fontColor, "55");
  const mutedColor = withAlpha(surfaceTheme.fontColor, "80");
  const rowBackground = withAlpha(surfaceTheme.fontColor, "08");
  const assignedServices = selectedDesk
    ? services.filter((service) => (selectedDesk.services || []).map(String).includes(String(service.id)))
    : services;

  if (assignedServices.length === 0) {
    return (
      <div className="flex h-full min-h-[12rem] items-center justify-center text-sm text-center" style={{ color: faintColor }}>
        No {serviceWordPluralLower} assigned yet.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto qp-scroll pr-1 pb-1">
      {assignedServices.map((service) => {
        const key = selectedDesk ? `${selectedDesk.id}|${service.id}` : null;
        const served = key ? servedByDeskService[key] || 0 : 0;
        const absent = key ? absentByDeskService[key] || 0 : 0;
        const removed = key ? removedByDeskService[key] || 0 : 0;
        const stats = [
          { label: "Served", value: served, color: C.teal, icon: Check },
          { label: "Absent", value: absent, color: C.coral, icon: X },
          { label: "Removed", value: removed, color: faintColor, icon: MinusCircle },
        ];

        return (
          <div
            key={service.id}
            className="rounded-lg border px-3 py-3"
            style={{ borderColor: surfaceTheme.borderColor, background: rowBackground, borderRadius: surfaceTheme.radius }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: surfaceTheme.fontColor }}>
                    {service.name}
                  </div>
                </div>
              </div>

              <div className="grid min-w-[17rem] grid-cols-3 gap-2">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.label}
                      className="rounded-md border px-2.5 py-2"
                      style={{ borderColor: withAlpha(surfaceTheme.borderColor, "80"), background: withAlpha(surfaceTheme.fontColor, "06"), borderRadius: surfaceTheme.radius }}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em]" style={{ color: mutedColor }}>
                        <Icon size={12} style={{ color: stat.color }} />
                        {stat.label}
                      </div>
                      <div className="qp-mono mt-1 text-base font-semibold" style={{ color: stat.color }}>
                        {stat.value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
