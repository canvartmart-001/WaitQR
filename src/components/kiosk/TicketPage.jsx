import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  BriefcaseBusiness,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import { C } from "../../lib/theme";
import { countdownLabel, waitEstimateDisplay } from "../../lib/format";
import { getSubmissionByLabel } from "../../lib/submissionsApi";

const ticketPageStyle = {
  width: "min(100%, 520px)",
};

function withAlpha(color, opacity) {
  const hex = String(color || "").replace("#", "");
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, "0");
    return `#${hex}${alpha}`;
  }
  return `color-mix(in srgb, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

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
  if (Number(ticketPosition) !== 1 || !waitEstimate) return false;
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

function SubmissionCard({
  submission,
  serviceName,
  ticketPosition,
  ticketDeskName,
  waitEstimate,
  now,
  theme,
}) {
  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
  };
  const serviceLine = submission.serviceId ? serviceName(submission.serviceId) : "General";
  const isCalled = submission.status === "called";
  const positionLabel = ordinal(ticketPosition);
  const hasQueuePosition = !isCalled && Boolean(positionLabel);
  const estimateDisplay = waitEstimateDisplay(waitEstimate, now);
  const waitLabel = isReadyForCall(ticketPosition, waitEstimate, now, submission.status)
    ? "Wait for the call"
    : formatWaitEstimate(waitEstimate, now, submission.status);
  const showWaitBlock = !isCalled
    && (hasQueuePosition || waitLabel !== queueFallbackLabel(waitEstimate, submission.status));
  const showWaitHeading = waitLabel !== "Wait for the call";
  const waitHeading = estimateDisplay.paused
    ? "Counter on break"
    : estimateDisplay.delayed
      ? "Slight delay"
      : "Estimated wait";
  const position = Number(ticketPosition);
  const peopleAhead = Number.isFinite(position) ? Math.max(0, position - 1) : null;
  const joinedPosition = Math.max(1, Number(submission.joinedPosition) || position || 1);
  const totalPositionSteps = Math.max(0, joinedPosition - 1);
  const completedPositionSteps = Math.max(0, joinedPosition - Math.max(1, position || joinedPosition));
  const stepStartedAt = Number(waitEstimate?.positionStepStartedAt);
  const stepEndsAt = Number(waitEstimate?.positionStepEndsAt);
  const progressNow = estimateDisplay.paused
    ? Math.min(now, Number(waitEstimate?.pauseStartedAt) || now)
    : now;
  const stepDurationMs = stepEndsAt - stepStartedAt;
  const timedStepProgress = Number.isFinite(stepDurationMs) && stepDurationMs > 0
    ? Math.max(0, Math.min(0.94, (progressNow - stepStartedAt) / stepDurationMs))
    : 0;
  const positionProgress = totalPositionSteps === 0
    ? (position <= 1 ? 1 : 0)
    : (completedPositionSteps + (position > 1 ? timedStepProgress : 0)) / totalPositionSteps;
  const progress = isCalled || position === 1 ? 1 : Math.max(0.06, Math.min(0.99, positionProgress));
  const ringLength = 289;
  const panelStyle = {
    color: appearance.fontColor,
    backgroundColor: withAlpha(appearance.fontColor, 0.035),
    borderColor: appearance.borderColor,
    borderRadius: appearance.radius,
  };
  const statusMessage = isCalled
    ? `Your ticket has been called. Please proceed to ${ticketDeskName || "the counter"}.`
    : estimateDisplay.paused
      ? "The counter is on break. Your wait time is paused."
      : estimateDisplay.delayed
        ? "There is a slight delay. Your place in the queue is secured."
        : "Please wait nearby. We will call your ticket shortly.";
  const queueMessage = peopleAhead == null
    ? "Your queue position is being updated"
    : peopleAhead === 0
      ? "You're next in line"
      : `There ${peopleAhead === 1 ? "is" : "are"} ${peopleAhead} ${peopleAhead === 1 ? "person" : "people"} ahead of you`;

  return (
    <div className="mx-auto flex w-full flex-col gap-4" style={ticketPageStyle}>
      <section
        className="qp-ticket-ring-host relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center"
        aria-label="Current queue status"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 108 108" aria-hidden="true">
          <circle
            cx="54"
            cy="54"
            r="46"
            fill="none"
            stroke={appearance.borderColor}
            strokeWidth="3.2"
          />
          <circle
            data-testid="queue-position-progress"
            cx="54"
            cy="54"
            r="46"
            fill="none"
            stroke={appearance.accentColor}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeDasharray={`${ringLength * progress} ${ringLength}`}
            transform="rotate(-90 54 54)"
            style={{ transition: "stroke-dasharray 600ms ease" }}
          />
        </svg>

        <div className="relative z-[1] flex h-[82%] w-[78%] flex-col items-center justify-center px-4 text-center">
          <div
            className="inline-flex rounded px-2 py-1 text-base font-semibold uppercase leading-none"
            style={{
              color: appearance.accentColor,
              backgroundColor: withAlpha(appearance.fontColor, 0.035),
            }}
          >
            {submission.label}
          </div>
          <div className="mt-2 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
            Your ticket
          </div>

          <div className="mt-4 flex flex-col items-center justify-center">
            {isCalled ? (
              <>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: appearance.accentColor }}>
                  You're called
                </div>
                <div className="mt-3 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                  Please proceed to
                </div>
                <div className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {ticketDeskName || "the counter"}
                </div>
              </>
            ) : hasQueuePosition ? (
              <>
                <div className="text-[4.75rem] font-semibold leading-none sm:text-[6rem]" style={{ color: appearance.accentColor }}>
                  {positionLabel}
                </div>
                <div className="mt-2 text-[11px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.68) }}>
                  In the queue
                </div>
              </>
            ) : (
              <div className="max-w-full text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: appearance.accentColor }}>
                {queueFallbackLabel(waitEstimate, submission.status)}
              </div>
            )}
          </div>

          {showWaitBlock ? (
            <div className="mt-4 w-full">
              <div className="mx-auto mb-3 w-2/3 border-t" style={{ borderColor: withAlpha(appearance.fontColor, 0.12) }} />
              <div className="min-h-[48px] text-center">
                {showWaitHeading ? (
                  <div className="text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.62) }}>
                    {waitHeading}
                  </div>
                ) : null}
                <div className="mt-0.5 text-xl font-semibold leading-none sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {waitLabel}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden border" style={panelStyle} aria-label="Ticket details">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            style={{ color: appearance.accentColor, borderColor: appearance.borderColor }}
          >
            <BriefcaseBusiness size={19} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.58) }}>
              Service
            </div>
            <div className="mt-0.5 truncate text-base font-semibold">{serviceLine}</div>
          </div>
        </div>
        <div className="mx-4 border-t" style={{ borderColor: appearance.borderColor }} />
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
            style={{ color: appearance.accentColor, borderColor: appearance.borderColor }}
          >
            <MapPin size={19} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.58) }}>
              Counter
            </div>
            <div
              className="mt-0.5 truncate text-base font-semibold"
              style={{ color: ticketDeskName ? appearance.accentColor : appearance.fontColor }}
            >
              {ticketDeskName || "Assigning counter"}
            </div>
          </div>
        </div>
      </section>

      <section
        className="flex items-center gap-3 border px-4 py-3.5"
        style={{
          color: appearance.fontColor,
          backgroundColor: withAlpha(appearance.accentColor, 0.11),
          borderColor: withAlpha(appearance.accentColor, 0.42),
          borderRadius: appearance.radius,
        }}
        aria-live="polite"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ color: appearance.accentColor, backgroundColor: withAlpha(appearance.accentColor, 0.12) }}
        >
          <BellRing size={19} />
        </span>
        <p className="m-0 text-sm leading-relaxed">{statusMessage}</p>
      </section>

      {!isCalled ? (
        <section className="flex items-center gap-3 border px-4 py-3" style={panelStyle}>
          <UsersRound size={20} className="shrink-0" style={{ color: appearance.accentColor }} />
          <p className="m-0 text-sm">{queueMessage}</p>
        </section>
      ) : null}
    </div>
  );
}

export function TicketPage({
  ticketLabel,
  ticket,
  ticketsLoaded,
  ticketPosition,
  ticketDeskName,
  waitEstimate,
  now = Date.now(),
  serviceName,
  theme,
  onNavigate,
}) {
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

  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
  };

  return (
    <main
      className="qp-page-shell qp-kiosk-page-shell min-h-screen py-6 sm:py-8"
      style={{ backgroundColor: appearance.bgColor, color: appearance.fontColor }}
    >
      <section className="qp-kiosk-panel" style={ticketPageStyle}>
        {loading ? (
          <div
            className="mx-auto flex min-h-72 items-center justify-center border px-8 py-10 text-center"
            style={{
              color: withAlpha(appearance.fontColor, 0.62),
              borderColor: appearance.borderColor,
              borderRadius: appearance.radius,
              backgroundColor: withAlpha(appearance.fontColor, 0.035),
            }}
          >
            <div className="flex items-center gap-3 text-sm sm:text-base">
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
            theme={appearance}
          />
        ) : (
          <button
            type="button"
            onClick={() => onNavigate?.("/")}
            className="mx-auto flex min-h-72 w-full items-center justify-center gap-3 border px-8 py-10 text-center"
            style={{
              color: appearance.fontColor,
              borderColor: appearance.borderColor,
              borderRadius: appearance.radius,
              backgroundColor: withAlpha(appearance.fontColor, 0.035),
            }}
          >
            <ArrowLeft size={18} style={{ color: appearance.accentColor }} />
            {error || "Ticket not found."}
          </button>
        )}
      </section>
    </main>
  );
}
