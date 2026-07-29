import { useEffect, useState } from "react";
import { ArrowLeft, Ticket } from "lucide-react";
import { C } from "../../lib/theme";
import { countdownLabel, waitEstimateDisplay } from "../../lib/format";
import { getSubmissionByLabel } from "../../lib/submissionsApi";

const ticketFrameStyle = {
  width: "min(88vw, 70vh, 540px)",
};

function formatWaitEstimate(estimate, now, status) {
  if (status === "completed") return "Completed";
  if (status === "skipped" || status === "removed") return "No longer waiting";
  if (!estimate) return "Calculating";
  if (estimate.status === "serving") return "Now serving";

  const display = waitEstimateDisplay(estimate, now);
  return display.waitMs == null ? "Calculating" : countdownLabel(display.waitMs);
}

function isReadyForCall(ticketPosition, waitEstimate, now, status) {
  if (status !== "queued" && status !== "called") return false;
  const position = Number(ticketPosition);
  if (position !== 1 || !waitEstimate) return false;
  const display = waitEstimateDisplay(waitEstimate, now);
  return !display.paused && !display.delayed && display.waitMs === 0;
}

function ordinal(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const whole = Math.trunc(number);
  if (whole <= 0) return "";
  const mod100 = whole % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${whole}th`;
  const mod10 = whole % 10;
  if (mod10 === 1) return `${whole}st`;
  if (mod10 === 2) return `${whole}nd`;
  if (mod10 === 3) return `${whole}rd`;
  return `${whole}th`;
}

function queueFallbackLabel(waitEstimate, status) {
  if (status === "completed") return "Completed";
  if (status === "skipped" || status === "removed") return "No longer waiting";
  if (status === "called") return "You're called";
  if (waitEstimate?.status === "serving" || status === "serving") return "Now serving";
  return "Queue position loading";
}

function SubmissionCard({ submission, serviceName, ticketPosition, ticketDeskName, waitEstimate, now }) {
  const serviceLine = submission.serviceId ? serviceName(submission.serviceId) : "General";
  const isCalled = submission.status === "called";
  const positionLabel = ordinal(ticketPosition);
  const hasQueuePosition = !isCalled && Boolean(positionLabel);
  const waitLabel = isReadyForCall(ticketPosition, waitEstimate, now, submission.status)
    ? "Wait for the call"
    : formatWaitEstimate(waitEstimate, now, submission.status);
  const showWaitBlock = !isCalled && (hasQueuePosition || waitLabel !== queueFallbackLabel(waitEstimate, submission.status));
  const showWaitHeading = waitLabel !== "Wait for the call";
  const estimateDisplay = waitEstimateDisplay(waitEstimate, now);
  const waitHeading = estimateDisplay.paused
    ? "Counter on break"
    : estimateDisplay.delayed
      ? "Taking longer than usual"
      : "Estimated wait";

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
          {isCalled ? (
            <div className="max-w-full px-4">
              <div className="text-3xl font-semibold leading-tight md:text-4xl" style={{ color: C.amber }}>
                You're called
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
                Please proceed to
              </div>
              <div className="mt-2 text-2xl font-semibold leading-tight md:text-3xl" style={{ color: C.textLight }}>
                {ticketDeskName || "the desk"}
              </div>
            </div>
          ) : hasQueuePosition ? (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
                You are
              </div>
              <div className="mt-1 text-[clamp(4rem,10vw,6.5rem)] font-semibold leading-none" style={{ color: C.amber }}>
                {positionLabel}
              </div>
              <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
                In the Queue
              </div>
            </>
          ) : (
            <div className="max-w-full text-3xl font-semibold leading-tight md:text-4xl" style={{ color: C.amber }}>
              {queueFallbackLabel(waitEstimate, submission.status)}
            </div>
          )}
          {showWaitBlock ? (
            <div className="mt-4 px-6">
              <div className="text-2xl font-semibold leading-none md:text-3xl" style={{ color: C.textLight }}>
                {waitLabel}
              </div>
              {showWaitHeading ? (
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.textMuted }}>
                  {waitHeading}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="w-full space-y-1 text-center">
          <div className="truncate text-base font-semibold tracking-wide md:text-lg" style={{ color: C.textLight }}>
            {serviceLine}
          </div>
          {ticketDeskName && !isCalled ? (
            <div className="truncate text-sm font-semibold tracking-wide md:text-base" style={{ color: C.amber }}>
              {ticketDeskName}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TicketPage({ ticketLabel, ticket, ticketsLoaded, ticketPosition, ticketDeskName, waitEstimate, now = Date.now(), serviceName, onNavigate }) {
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
          <SubmissionCard
            submission={submission}
            serviceName={serviceName}
            ticketPosition={ticketPosition}
            ticketDeskName={ticketDeskName}
            waitEstimate={waitEstimate}
            now={now}
          />
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
