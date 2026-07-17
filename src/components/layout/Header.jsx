import { MonitorPlay, PlusSquare, RotateCcw, Settings2, Ticket } from "lucide-react";
import { C } from "../../lib/theme";

export function Header({ currentPage, onNavigate, onReset }) {
  const onCreatePage = currentPage === "create";
  const onLivePage = currentPage === "live";
  const onSettingsPage = currentPage === "settings";
  const handleCreateClick = () => {
    if (onCreatePage) {
      onNavigate("/");
      return;
    }

    window.open("/create", "_blank", "noopener,noreferrer");
  };

  return (
    <header>
      <div className="qp-container qp-header-row">
        <div className="qp-header-brand">
          <div
            className="qp-icon-box"
            style={{ background: C.amberSoft, border: `1px solid ${C.amber}` }}
          >
            <Ticket size={20} style={{ color: C.amber }} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate" style={{ color: C.textLight }}>
              WaitQR
            </h1>
          </div>
        </div>

        <div className="qp-header-actions">
          <button
            type="button"
            onClick={() => onNavigate(onLivePage ? "/" : "/live")}
            title={onLivePage ? "Back to dashboard" : "Live screen page"}
            className="qp-focusable flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold uppercase tracking-[0.12em]"
            style={{
              borderColor: onLivePage ? C.teal : C.ink600,
              color: onLivePage ? C.teal : C.textLight,
              background: onLivePage ? C.tealSoft : "transparent",
            }}
          >
            <MonitorPlay size={14} />
            {onLivePage ? "Dashboard" : "Live"}
          </button>
          <button
            type="button"
            onClick={handleCreateClick}
            title={onCreatePage ? "Back to dashboard" : "Join queue page"}
            className="qp-focusable flex items-center justify-center gap-2 px-3 py-2 rounded-md border text-xs font-semibold uppercase tracking-[0.12em]"
            style={{
              borderColor: onCreatePage ? C.amber : C.ink600,
              color: onCreatePage ? C.amber : C.textLight,
              background: onCreatePage ? C.amberSoft : "transparent",
            }}
          >
            <PlusSquare size={14} />
            {onCreatePage ? "Dashboard" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => onNavigate("/settings")}
            title="Settings"
            className="qp-focusable flex items-center justify-center p-2 rounded-md border"
            style={{ borderColor: onSettingsPage ? C.amber : C.ink600, color: onSettingsPage ? C.amber : C.textMuted }}
          >
            <Settings2 size={16} />
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset queue"
            className="qp-focusable flex items-center justify-center p-2 rounded-md border"
            style={{ borderColor: C.ink600, color: C.textMuted }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
