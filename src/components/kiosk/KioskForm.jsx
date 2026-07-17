import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, ArrowRight, Bell, Ticket } from "lucide-react";
import { DEFAULT_SERVICE_ID } from "../../lib/seedData";
import { C } from "../../lib/theme";
import { getServiceAvailability } from "../../lib/serviceAvailability";

export function KioskForm({
  form,
  setForm,
  formError,
  setFormError,
  desks,
  services,
  serviceWord,
  onIssue,
  issueStep,
  advanceIssueStep,
  setIssueStep,
  issuePending,
}) {
  const showServiceSelection = services.length > 1;
  const directJoin = !showServiceSelection;
  const defaultServiceId = services[0]?.id || DEFAULT_SERVICE_ID;
  const serviceAvailability = useMemo(() => {
    const map = {};
    services.forEach((service) => {
      map[service.id] = getServiceAvailability(desks, service.id);
    });
    return map;
  }, [desks, services]);
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (issueStep === 1) {
      nameInputRef.current?.focus();
    }
  }, [issueStep]);

  useEffect(() => {
    if (directJoin && issueStep !== 1) {
      setIssueStep?.(1);
    }
  }, [directJoin, issueStep, setIssueStep]);

  const joinActions = (
    <div className="qp-kiosk-actions">
      <button
        type="button"
        onClick={() => {
          if (formError) setFormError?.("");
          onIssue("general", directJoin ? defaultServiceId : undefined);
        }}
        disabled={issuePending}
        className="qp-focusable inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-semibold transition-opacity"
        style={{ background: C.textLight, color: C.ink900, boxShadow: "0 10px 22px rgba(0,0,0,0.2)", opacity: issuePending ? 0.6 : 1 }}
      >
        <Ticket size={16} />
        {issuePending ? "Saving..." : "Join General"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (formError) setFormError?.("");
          onIssue("priority", directJoin ? defaultServiceId : undefined);
        }}
        disabled={issuePending}
        className="qp-focusable inline-flex items-center justify-center gap-2 rounded-2xl py-3.5 px-4 text-sm font-semibold transition-opacity"
        style={{ background: C.amber, color: C.ink900, boxShadow: "0 10px 22px rgba(0,0,0,0.2)", opacity: issuePending ? 0.6 : 1 }}
      >
        <Bell size={16} />
        {issuePending ? "Saving..." : "Join Priority"}
      </button>
    </div>
  );

  return (
    <div
      className="qp-kiosk-card overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #1F252F 0%, #171B22 100%)",
        borderColor: C.ink600,
        borderWidth: 1,
        borderStyle: "solid",
        color: C.textLight,
        boxShadow: "0 12px 28px rgba(0,0,0,0.22)",
      }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold leading-tight">Join the queue</div>
        </div>
        {issueStep === 2 && !directJoin ? (
          <button
            type="button"
            onClick={() => setIssueStep?.(1)}
            className="qp-focusable inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors"
            style={{ borderColor: C.ink600, color: C.textLight, background: "rgba(255,255,255,0.03)" }}
          >
            <ArrowLeft size={12} />
            Back
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        {issueStep === 1 && (
          <>
            <div className="grid gap-3">
              <input
                ref={nameInputRef}
                type="text"
                value={form.name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, name: e.target.value }));
                  if (formError) setFormError?.("");
                }}
                placeholder="Name"
                className="qp-focusable w-full rounded-2xl px-4 py-4 text-[15px] font-medium outline-none transition-colors"
                style={{
                  background: C.ink800,
                  border: `1px solid ${C.ink600}`,
                  color: C.textLight,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              />
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => {
                  setForm((f) => ({ ...f, phone: e.target.value }));
                  if (formError) setFormError?.("");
                }}
                placeholder="Phone"
                className="qp-focusable w-full rounded-2xl px-4 py-4 text-[15px] font-medium outline-none transition-colors"
                style={{
                  background: C.ink800,
                  border: `1px solid ${C.ink600}`,
                  color: C.textLight,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
              />
            </div>

            {directJoin ? (
              joinActions
            ) : (
              <button
                type="button"
                onClick={advanceIssueStep}
                disabled={issuePending}
                className="qp-focusable flex items-center justify-center gap-2 rounded-2xl py-3.5 px-3 text-sm font-semibold transition-opacity"
                style={{ background: C.amber, color: C.ink900, boxShadow: "0 10px 22px rgba(0,0,0,0.2)", opacity: issuePending ? 0.6 : 1 }}
              >
                Continue
                <ArrowRight size={15} />
              </button>
            )}

            {formError && (
              <div className="text-xs font-medium leading-snug" style={{ color: C.coral }}>
                {formError}
              </div>
            )}
          </>
        )}

        {issueStep === 2 && (
          <>
            <div
              className="rounded-2xl border px-4 py-3.5"
              style={{
                background: C.ink800,
                borderColor: C.ink600,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div className="text-[10px] uppercase tracking-[0.16em] opacity-50 mb-1" style={{ color: C.textMuted }}>
                Visitor
              </div>
              <div className="text-base font-semibold leading-tight" style={{ color: C.textLight }}>
                {form.name || "—"}
              </div>
              <div className="mt-1.5 text-[15px]" style={{ color: C.textLight }}>
                {form.phone || "—"}
              </div>
            </div>

            {showServiceSelection ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] opacity-50" style={{ color: C.textMuted }}>
                    {serviceWord}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.12em] opacity-50" style={{ color: C.textMuted }}>
                    {services.length} options
                  </div>
                </div>
                <div className="grid gap-2">
                  {services.map((s) => {
                    const selected = form.serviceId === s.id;
                    const availability = serviceAvailability[s.id] || { available: true, assignedCount: 0 };
                    const unavailable = !availability.available;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          if (availability.available) {
                            setForm((f) => ({ ...f, serviceId: s.id }));
                            if (formError) setFormError?.("");
                          }
                        }}
                        className="qp-focusable flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors"
                        style={{
                          background: selected
                            ? unavailable
                              ? "rgba(226,97,79,0.16)"
                              : "rgba(232,163,61,0.16)"
                            : unavailable
                              ? "rgba(255,255,255,0.01)"
                              : "rgba(255,255,255,0.015)",
                          color: C.textLight,
                          opacity: unavailable ? 0.55 : 1,
                        }}
                      >
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold truncate">{s.name}</div>
                          {unavailable ? (
                            <div className="mt-0.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: C.coral }}>
                              Unavailable
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {joinActions}

            {formError && (
              <div className="text-xs font-medium leading-snug" style={{ color: C.coral }}>
                {formError}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
