import { C } from "../../lib/theme";

/**
 * Decorative mascot shown when a desk or the live board has no one waiting. Pure presentational
 * SVG — `scale` lets callers size it down for tighter spaces (e.g. the live board grid) without
 * re-deriving every coordinate.
 */
export function SnoozingCat({ scale = 1 }) {
  const w = 84 * scale;
  const h = 64 * scale;
  return (
    <div style={{ position: "relative", width: w, height: h, overflow: "hidden" }}>
      {/* Floating Z's — positioned above the head/neck so they read as coming from the cat.
          opacity starts at 0 inline so there's no pop before the delayed animation kicks in. */}
      <span className="qp-z1 qp-mono" style={{ position: "absolute", top: 0 * scale, right: 50 * scale, fontSize: 12 * scale, fontWeight: 700, color: C.amber, opacity: 0, pointerEvents: "none", lineHeight: 1 }}>z</span>
      <span className="qp-z2 qp-mono" style={{ position: "absolute", top: 4 * scale, right: 61 * scale, fontSize: 9.5 * scale, fontWeight: 700, color: C.textMuted, opacity: 0, pointerEvents: "none", lineHeight: 1 }}>z</span>
      <span className="qp-z3 qp-mono" style={{ position: "absolute", top: 3 * scale, right: 71 * scale, fontSize: 7.5 * scale, fontWeight: 700, color: C.textFaint, opacity: 0, pointerEvents: "none", lineHeight: 1 }}>z</span>
      <svg width={w} height={h} viewBox="0 0 84 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", bottom: 0, left: 0, overflow: "hidden" }}>
        <g className="qp-cat-body">
          {/* Tail — curled around the body, anchored at the hip so it never swings outside the canvas */}
          <g className="qp-cat-tail">
            <path
              d="M58 46.5 C70 47.5 76 41 73.5 33 C71.5 26.5 64.5 24.5 60.5 28.5"
              stroke={C.ink600}
              strokeWidth="6.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M58 46.5 C70 47.5 76 41 73.5 33 C71.5 26.5 64.5 24.5 60.5 28.5"
              stroke={C.ink700}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
          </g>
          {/* Body — rounded loaf, soft underside shadow */}
          <ellipse cx="40" cy="48" rx="26" ry="14.5" fill={C.ink600} />
          <ellipse cx="40" cy="52.5" rx="22" ry="6" fill={C.ink700} opacity="0.35" />
          {/* Body highlight for a touch of dimension */}
          <ellipse cx="33" cy="40" rx="13" ry="6" fill={C.ink700} opacity="0.3" />
          {/* Head */}
          <ellipse cx="18" cy="38" rx="14" ry="12.5" fill={C.ink600} />
          {/* Left ear — base sunk into the head, shorter height */}
          <g className="qp-cat-ear" style={{ transformOrigin: "12px 33px" }}>
            <polygon points="8,33 11,21 17,31" fill={C.ink600} />
            <polygon points="9.7,31.5 11.7,22.7 14.8,30" fill={C.ink700} />
          </g>
          {/* Right ear — base sunk into the head, close to the left ear, shorter height */}
          <g className="qp-cat-ear" style={{ transformOrigin: "21px 33px", animationDelay: "2.5s" }}>
            <polygon points="16,31 22,21 26,33" fill={C.ink600} />
            <polygon points="17.5,30 22,22.7 24,31.5" fill={C.ink700} />
          </g>
          {/* Closed sleepy eyes */}
          <path d="M11 37.5 Q14 35 17 37.5" stroke={C.textFaint} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          <path d="M19 37.5 Q22 35 25 37.5" stroke={C.textFaint} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          {/* Tiny content smile */}
          <path d="M16.5 41.5 Q18 43 19.5 41.5" stroke={C.textFaint} strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.7" />
          {/* Nose */}
          <ellipse cx="18" cy="40" rx="1.4" ry="1" fill={C.amber} opacity="0.8" />
          {/* Whiskers */}
          <path d="M8 39 L1 38" stroke={C.textFaint} strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
          <path d="M8 41.5 L1 42.5" stroke={C.textFaint} strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
          <path d="M28 39 L35 38" stroke={C.textFaint} strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
          <path d="M28 41.5 L35 42.5" stroke={C.textFaint} strokeWidth="0.8" strokeLinecap="round" opacity="0.45" />
          {/* Tucked front paw */}
          <ellipse cx="29" cy="58.5" rx="6.5" ry="3.4" fill={C.ink700} />
          <ellipse cx="42" cy="59.5" rx="6.5" ry="3.2" fill={C.ink700} />
        </g>
      </svg>
    </div>
  );
}
