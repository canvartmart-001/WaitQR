import { Ticket } from "lucide-react";
import { C } from "../../lib/theme";

export function IssueToast({ toast, serviceName }) {
  if (!toast) return null;
  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto z-50 qp-toast" role="status">
      <div
        className="qp-ticket flex w-full sm:w-auto sm:max-w-sm items-center gap-3 rounded-lg px-5 py-3 shadow-lg border-2 border-dashed"
        style={{ background: C.paper, color: C.inkText, borderColor: C.paperLine }}
      >
        <Ticket size={20} style={{ color: toast.type === "priority" ? C.coral : C.amber }} />
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider opacity-60">
            {toast.existing
              ? `Already has a ticket — ${toast.where}`
              : toast.type === "priority"
              ? "Priority ticket issued"
              : "Ticket issued"}
          </div>
          <div className="qp-ticket-face text-xl font-semibold leading-tight">{toast.label}</div>
          {toast.name && (
            <div className="text-xs mt-0.5 opacity-70 truncate" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
              {toast.name}
              {toast.serviceId ? ` · ${serviceName(toast.serviceId)}` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
