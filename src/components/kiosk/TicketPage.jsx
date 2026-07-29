import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  BriefcaseBusiness,
  Check,
  MapPin,
  Ticket,
  Undo2,
  UsersRound,
  X,
} from "lucide-react";
import { C } from "../../lib/theme";
import { countdownLabel, waitEstimateDisplay } from "../../lib/format";
import { getSubmissionByLabel, requestSubmissionRecall } from "../../lib/submissionsApi";

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
  if (status === "skipped" || status === "absent") return "You were missed";
  if (status === "removed") return "Ticket removed";
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
  if (status === "skipped" || status === "absent") return "You were missed";
  if (status === "removed") return "Ticket removed";
  if (status === "called") return "You're called";
  if (waitEstimate?.status === "serving" || status === "serving") return "Now serving";
  return "Queue position loading";
}

function ticketThemeColor(status, accentColor) {
  if (status === "called") return C.amber;
  if (status === "serving" || status === "completed") return C.teal;
  if (status === "skipped" || status === "absent" || status === "removed") return C.coral;
  return accentColor;
}

function SubmissionCard({
  submission,
  serviceName,
  ticketPosition,
  ticketDeskName,
  waitEstimate,
  now,
  theme,
  onRequestRecall,
  recallRequesting,
  recallError,
}) {
  const appearance = {
    accentColor: theme?.accentColor || C.amber,
    bgColor: theme?.bgColor || C.ink900,
    fontColor: theme?.fontColor || C.textLight,
    borderColor: theme?.borderColor || C.ink600,
    radius: Number(theme?.radius) || 8,
  };

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    let themeMeta = document.querySelector('meta[name="theme-color"]');
    const createdMeta = !themeMeta;
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.setAttribute("name", "theme-color");
      document.head.appendChild(themeMeta);
    }

    const previousColor = themeMeta.getAttribute("content");
    themeMeta.setAttribute("content", ticketThemeColor(submission.status, appearance.accentColor));

    return () => {
      if (createdMeta) {
        themeMeta.remove();
      } else if (previousColor == null) {
        themeMeta.removeAttribute("content");
      } else {
        themeMeta.setAttribute("content", previousColor);
      }
    };
  }, [appearance.accentColor, submission.status]);

  const serviceLine = submission.serviceId ? serviceName(submission.serviceId) : "General";
  const isQueued = submission.status === "queued";
  const isCalled = submission.status === "called";
  const isServing = submission.status === "serving";
  const isCompleted = submission.status === "completed";
  const isAbsent = submission.status === "skipped" || submission.status === "absent";
  const isRemoved = submission.status === "removed";
  const isNoLongerWaiting = isAbsent || isRemoved;
  const recallRequested = Boolean(submission.recallRequestedAt);
  const livePosition = Number(ticketPosition);
  const initialPosition = Number(submission.joinedPosition);
  const effectivePosition = Number.isFinite(livePosition) && livePosition > 0
    ? livePosition
    : isQueued && Number.isFinite(initialPosition) && initialPosition > 0
      ? initialPosition
      : null;
  const positionLabel = ordinal(effectivePosition);
  const hasQueuePosition = isQueued && Boolean(positionLabel);
  const estimateDisplay = waitEstimateDisplay(waitEstimate, now);
  const waitLabel = isReadyForCall(effectivePosition, waitEstimate, now, submission.status)
    ? "Wait for the call"
    : formatWaitEstimate(waitEstimate, now, submission.status);
  const showWaitBlock = isQueued
    && (hasQueuePosition || waitLabel !== queueFallbackLabel(waitEstimate, submission.status));
  const showWaitHeading = waitLabel !== "Wait for the call";
  const waitHeading = estimateDisplay.paused
    ? "Counter on break"
    : estimateDisplay.delayed
      ? "Slight delay"
      : "Estimated wait";
  const position = Number(effectivePosition);
  const peopleAhead = isQueued && Number.isFinite(position) ? Math.max(0, position - 1) : null;
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
  const isFinalRingState = isCalled || isServing || isCompleted || isNoLongerWaiting;
  const finalCountdownComplete = estimateDisplay.waitMs === 0
    && !estimateDisplay.paused
    && !estimateDisplay.delayed;
  const firstPositionProgress = 0.75 + 0.25 * (finalCountdownComplete ? 1 : timedStepProgress);
  const progress = isFinalRingState
    ? 1
    : position === 1
      ? Math.max(0.75, Math.min(1, firstPositionProgress))
      : Math.max(0.06, Math.min(0.99, positionProgress));
  const ringLength = 289;
  const statusAccent = isNoLongerWaiting
    ? C.coral
    : isServing || isCompleted
      ? C.teal
      : isCalled
        ? C.amber
        : appearance.accentColor;
  const panelStyle = {
    color: appearance.fontColor,
    backgroundColor: withAlpha(appearance.fontColor, 0.035),
    borderColor: appearance.borderColor,
    borderRadius: appearance.radius,
  };
  const statusMessage = isCalled
    ? `Your ticket has been called. Please proceed to ${ticketDeskName || "the counter"}.`
    : isServing
      ? `You are now being served at ${ticketDeskName || "the counter"}.`
      : isCompleted
        ? "Your service has been completed."
        : isAbsent
          ? "You were marked absent and removed from the queue."
          : isRemoved
            ? "This ticket was removed from the queue."
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
            stroke={statusAccent}
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
              color: statusAccent,
              backgroundColor: isNoLongerWaiting
                ? C.coralSoft
                : isServing || isCompleted
                  ? C.tealSoft
                  : isCalled
                    ? C.amberSoft
                    : withAlpha(appearance.fontColor, 0.035),
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
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.amber }}>
                  You're called
                </div>
                <div className="mt-3 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                  Please proceed to
                </div>
                <div className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {ticketDeskName || "the counter"}
                </div>
              </>
            ) : isServing ? (
              <>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.teal }}>
                  Now serving
                </div>
                <div className="mt-3 text-[10px] font-semibold uppercase" style={{ color: withAlpha(appearance.fontColor, 0.6) }}>
                  At
                </div>
                <div className="mt-1 text-xl font-semibold sm:text-2xl" style={{ color: appearance.fontColor }}>
                  {ticketDeskName || "the counter"}
                </div>
              </>
            ) : isCompleted ? (
              <>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.teal }}>
                  Completed
                </div>
                <div className="mt-2 text-[10px] font-semibold uppercase" style={{ color: C.teal }}>
                  Service finished
                </div>
              </>
            ) : isNoLongerWaiting ? (
              <>
                <div className="text-3xl font-semibold leading-tight sm:text-4xl" style={{ color: C.coral }}>
                  {isAbsent ? "You were missed" : "Ticket removed"}
                </div>
                <div className="mt-2 text-[10px] font-semibold uppercase" style={{ color: C.coral }}>
                  {isAbsent ? "Marked absent" : "No longer in queue"}
                </div>
                {isAbsent ? (
                  <>
                    <button
                      type="button"
                      onClick={onRequestRecall}
                      disabled={recallRequested || recallRequesting}
                      className="qp-focusable mt-5 inline-flex h-8 items-center justify-center gap-1.5 px-3 text-xs font-semibold leading-none disabled:cursor-default"
                      style={{
                        color: C.teal,
                        backgroundColor: recallRequested ? C.tealSoft : "transparent",
                        borderRadius: Math.min(appearance.radius, 6),
                      }}
                    >
                      <Undo2 size={13} className="block shrink-0" aria-hidden="true" />
                      <span className="leading-none">
                        {recallRequested ? "Recall requested" : recallRequesting ? "Requesting..." : "Recall me"}
                      </span>
                    </button>
                    {recallError ? (
                      <p className="mb-0 mt-1 max-w-48 text-center text-[10px]" style={{ color: C.coral }}>
                        {recallError}
                      </p>
                    ) : null}
                  </>
                ) : null}
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
          backgroundColor: withAlpha(statusAccent, 0.11),
          borderColor: withAlpha(statusAccent, 0.42),
          borderRadius: appearance.radius,
        }}
        aria-live="polite"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ color: statusAccent, backgroundColor: withAlpha(statusAccent, 0.12) }}
        >
          {isNoLongerWaiting ? <X size={19} /> : isCompleted ? <Check size={19} /> : <BellRing size={19} />}
        </span>
        <p className="m-0 text-sm leading-relaxed">{statusMessage}</p>
      </section>

      {isQueued ? (
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
  const [recallRequesting, setRecallRequesting] = useState(false);
  const [recallError, setRecallError] = useState("");

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

  const handleRecallRequest = async () => {
    if (!submission?.id || recallRequesting || submission.recallRequestedAt) return;
    setRecallRequesting(true);
    setRecallError("");

    try {
      const updatedSubmission = await requestSubmissionRecall(submission.id);
      if (updatedSubmission) setSubmission(updatedSubmission);
    } catch (requestError) {
      setRecallError(requestError.message || "Could not request a recall.");
    } finally {
      setRecallRequesting(false);
    }
  };

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
            onRequestRecall={handleRecallRequest}
            recallRequesting={recallRequesting}
            recallError={recallError}
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
