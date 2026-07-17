import { C } from "../../lib/theme";
import { LiveBoardCard } from "./LiveBoardCard";

export function LiveBoardSection({ desks, now, nextForDesk, nextTwoForDesk }) {
  return (
    <section className="qp-board qp-section-card" style={{ background: C.ink800, borderColor: C.hair }}>
      <div className="qp-livebar">
        <div className="qp-livebar-meta">
          <div className="flex items-center gap-2 text-sm" style={{ color: C.teal }}>
            <span className="w-2 h-2 rounded-full qp-livedot" style={{ background: C.teal }} />
            <span className="uppercase tracking-wider text-xs font-medium">Live</span>
          </div>
          <span className="qp-ticket-face text-sm" style={{ color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>
            {new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="qp-board-grid">
        {desks.map((d) => (
          <LiveBoardCard key={d.id} desk={d} nextForDesk={nextForDesk} nextTwoForDesk={nextTwoForDesk} />
        ))}
      </div>
    </section>
  );
}
