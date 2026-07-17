import { useEffect, useState } from "react";
import { ArrowLeft, Ticket } from "lucide-react";
import { C } from "../../lib/theme";
import { getSubmissionByLabel } from "../../lib/submissionsApi";

const ticketFrameStyle = {
  width: "min(88vw, 70vh, 540px)",
};

function SubmissionCard({ submission, serviceName, ticketPosition, ticketDeskName }) {
  const serviceLine = submission.serviceId ? serviceName(submission.serviceId) : "General";

  return (
    <div
      className="qp-ticket-ring-host relative mx-auto aspect-square rounded-full border-[14px] px-7 py-8 sm:px-8 sm:py-9 md:px-10 md:py-10"
      style={{
        ...ticketFrameStyle,
        background: C.ink900,
        borderColor: C.ink600,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      <div className="relative z-[1] flex h-full flex-col items-center justify-between text-center">
        <div
          className="inline-flex w-fit rounded-[6px] px-2 py-1 text-sm font-semibold uppercase tracking-[0.18em]"
          style={{ color: C.textLight, background: "rgba(255,255,255,0.04)" }}
        >
          {submission.label}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
            Position
          </div>
          <div className="mt-1 text-[clamp(4rem,10vw,6.5rem)] font-semibold leading-none" style={{ color: C.amber }}>
            {Number.isFinite(ticketPosition) ? String(ticketPosition) : "--"}
          </div>
        </div>

        <div className="w-full space-y-1 text-center">
          {submission.name ? (
            <div className="truncate text-sm font-normal tracking-wide md:text-base" style={{ color: C.textMuted }}>
              {submission.name}
            </div>
          ) : null}
          {submission.phone ? (
            <div className="truncate text-sm font-normal tracking-wide md:text-base" style={{ color: C.textMuted }}>
              {submission.phone}
            </div>
          ) : null}
          <div className="truncate text-base font-semibold tracking-wide md:text-lg" style={{ color: C.textLight }}>
            {serviceLine}
          </div>
          {ticketDeskName ? (
            <div className="truncate text-sm font-semibold tracking-wide md:text-base" style={{ color: C.amber }}>
              {ticketDeskName}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TicketPage({ ticketLabel, ticket, ticketsLoaded, ticketPosition, ticketDeskName, serviceName, onNavigate }) {
  const [submission, setSubmission] = useState(ticket || null);
  const [loading, setLoading] = useState(!ticket);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!ticketLabel) {
      setLoading(false);
      setSubmission(null);
      setError("Ticket not found.");
      return;
    }

    if (ticket && String(ticket.label).toUpperCase() === String(ticketLabel).toUpperCase()) {
      setSubmission(ticket);
      setLoading(false);
      setError("");
      return;
    }

    if (!ticketsLoaded) {
      setLoading(true);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    getSubmissionByLabel(ticketLabel)
      .then((nextSubmission) => {
        if (cancelled) return;
        setSubmission(nextSubmission);
        setError(nextSubmission ? "" : "Ticket not found.");
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setError(fetchError.message || "Failed to load ticket.");
        setSubmission(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticket, ticketLabel, ticketsLoaded]);

  return (
    <main className="qp-page-shell qp-kiosk-page-shell">
      <section className="qp-kiosk-panel" style={ticketFrameStyle}>
        {loading ? (
          <div
            className="qp-ticket-ring-host mx-auto flex aspect-square items-center justify-center rounded-full border-[14px] px-8 py-10 text-center"
            style={{ ...ticketFrameStyle, background: C.ink900, borderColor: C.ink600, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)" }}
          >
            <div className="relative z-[1] flex items-center gap-3 text-sm sm:text-base" style={{ color: C.textMuted }}>
              <Ticket size={18} />
              Loading ticket...
            </div>
          </div>
        ) : submission ? (
          <SubmissionCard submission={submission} serviceName={serviceName} ticketPosition={ticketPosition} ticketDeskName={ticketDeskName} />
        ) : (
          <div
            className="qp-ticket-ring-host mx-auto flex aspect-square items-center justify-center rounded-full border-[14px] px-8 py-10"
            style={{ ...ticketFrameStyle, background: C.ink900, borderColor: C.ink600, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.02)" }}
          >
            <div className="relative z-[1] flex items-center gap-3 text-sm sm:text-base" style={{ color: C.coral }}>
              <ArrowLeft size={18} />
              {error || "Ticket not found."}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
