import { Coffee } from "lucide-react";
import { C } from "../../lib/theme";
import { SnoozingCat } from "../shared/SnoozingCat";

export function LiveBoardCard({ desk, nextForDesk, nextTwoForDesk }) {
  const d = desk;
  const isOnBreak = !d.current && Boolean(d.onBreak);
  const nextTwo = !d.current && !isOnBreak ? nextTwoForDesk(d) : [];
  const isPriority = d.current?.type === "priority";
  const isStarted = !!d.current?.startedAt;
  const accent = d.current ? (isPriority ? C.coral : C.amber) : C.textFaint;
  const idleHasNext = !d.current && nextTwo.length > 0;
  const badgeText = isOnBreak ? "On break" : !d.current ? (idleHasNext ? "Next up" : "Idle") : isStarted ? "Serving" : "Called";
  const badgeColor = isOnBreak ? C.amber : !d.current ? C.textFaint : isStarted ? C.teal : C.amber;
  const badgeBg = isOnBreak ? C.amberSoft : !d.current ? "transparent" : isStarted ? C.tealSoft : C.amberSoft;
  const borderColor = isOnBreak ? C.amber : !d.current ? C.ink700 : isStarted ? C.teal : C.amber;
  const isCalledNotStarted = d.current && !isStarted;
  return (
    <div
      className={`qp-live-card ${isStarted ? "qp-serving" : ""}`}
      style={{
        background: C.ink900,
        borderColor: isCalledNotStarted ? C.amber : borderColor,
      }}
    >
      <span className="text-sm font-semibold uppercase tracking-[0.1em] truncate max-w-full" style={{ color: C.textMuted }}>
        {d.name}
      </span>

      <span
        className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
        style={{ background: badgeBg, color: badgeColor, border: `1px solid ${borderColor}` }}
      >
        {badgeText}
      </span>

      {d.current ? (
        <>
          <span key={d.current.label} className="qp-ticket-face qp-flip text-4xl md:text-5xl font-semibold tracking-wider leading-tight" style={{ color: accent }}>
            {d.current.label}
          </span>

          <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: C.textFaint, border: `1px solid ${C.ink700}` }}>
            Next
          </span>

          <span className="qp-ticket-face text-4xl md:text-5xl font-semibold tracking-wider leading-tight" style={{ color: C.textFaint }}>
            {nextForDesk(d) ? nextForDesk(d).label : "— —"}
          </span>
        </>
      ) : isOnBreak ? (
        <div className="flex flex-col items-center gap-2 py-2" style={{ color: C.amber }}>
          <Coffee size={24} aria-hidden="true" />
          <span className="text-[10px] font-medium uppercase tracking-[0.12em]">Counter on break</span>
        </div>
      ) : idleHasNext ? (
        <>
          <span key={nextTwo[0].label} className="qp-ticket-face qp-flip text-4xl md:text-5xl font-semibold tracking-wider leading-tight" style={{ color: C.textMuted }}>
            {nextTwo[0].label}
          </span>

          <span className="qp-ticket-face qp-shimmer-text text-[10px] font-medium uppercase tracking-[0.12em]">Please wait for the call</span>

          {nextTwo[1] && (
            <>
              <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ color: C.textFaint, border: `1px solid ${C.ink700}` }}>
                Next
              </span>

              <span className="qp-ticket-face text-4xl md:text-5xl font-semibold tracking-wider leading-tight" style={{ color: C.textFaint }}>
                {nextTwo[1].label}
              </span>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center gap-0.5 py-1">
          <SnoozingCat scale={0.85} />
          <span className="text-[10px] tracking-wide" style={{ color: C.textFaint }}>
            No one in queue
          </span>
        </div>
      )}
    </div>
  );
}
