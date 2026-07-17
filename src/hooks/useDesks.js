import { useState } from "react";
import { selectNextTicketForDesk } from "./useQueue";
import { DEFAULT_DESK_ID, DEFAULT_SERVICE_ID } from "../lib/seedData";

// >>> BACKEND INTEGRATION NOTE <<<
// Every action here (callNext, startService, completeTicket, skipTicket) currently
// mutates local state directly and optimistically. Once the backend exists, each of these should
// become "emit a socket event, let the server be the source of truth for the resulting `desks`/
// `queue` state, and reconcile." The setTimeout-based animation choreography (skippingDesk,
// startingDesk, etc.) is purely a UI concern and can stay client-side regardless — only the
// underlying data mutation needs to move server-side.
//
// `onTicketCompleted`/`onTicketSkipped` callbacks push into the served/absent logs (owned by
// useTicketLogs) without this hook needing to import that hook directly — keeps the dependency
// graph one-directional.

export function useDesks(initialDesks, { queue, setQueue, onTicketCompleted, onTicketSkipped, onTicketStatusChange }) {
  const [desks, setDesks] = useState(initialDesks);

  // Per-desk transient animation flags — purely presentational, not server state.
  const [completingDesk, setCompletingDesk] = useState(null);
  const [startingDesk, setStartingDesk] = useState(null);
  const [justRevealedDesk, setJustRevealedDesk] = useState(null);
  const [skippingDesk, setSkippingDesk] = useState(null);

  const callNext = (deskId) => {
    const desk = desks.find((d) => d.id === deskId);
    if (!desk || desk.current) return;
    const best = selectNextTicketForDesk(queue, desk);
    if (!best) return;
    const idx = queue.findIndex((t) => t.id === best.id);
    const { _skipPriority, ...ticket } = queue[idx];
    const rest = [...queue.slice(0, idx), ...queue.slice(idx + 1)];
    setQueue(rest);
    setDesks((ds) =>
      ds.map((d) =>
        d.id === deskId
          ? { ...d, current: { ...ticket, calledAt: Date.now(), startedAt: null }, lastServiceId: ticket.serviceId || "__general__" }
          : d
      )
    );
    onTicketStatusChange?.(ticket.id, "called", { deskId });
  };

  const startService = (deskId) => {
    setStartingDesk(deskId);
    // Brief delay so play-out animation is visible before timer renders
    setTimeout(() => {
      setDesks((ds) =>
        ds.map((d) =>
          d.id === deskId && d.current && !d.current.startedAt
            ? { ...d, current: { ...d.current, startedAt: Date.now() } }
            : d
        )
      );
      const current = desks.find((d) => d.id === deskId)?.current;
      if (current) onTicketStatusChange?.(current.id, "serving", { deskId });
      setStartingDesk(null);
    }, 280);
  };

  const completeTicket = (deskId) => {
    const desk = desks.find((d) => d.id === deskId);
    if (!desk || !desk.current) return;
    const waitMs = desk.current.calledAt - desk.current.createdAt;
    const finishedTicket = desk.current;
    // Trigger exit animation first, then commit state after it runs
    setCompletingDesk(deskId);
    setTimeout(() => {
      onTicketCompleted({
        waitMs,
        completedAt: Date.now(),
        id: finishedTicket.id,
        deskId,
        serviceId: finishedTicket.serviceId,
        label: finishedTicket.label,
        name: finishedTicket.name,
        phone: finishedTicket.phone,
        type: finishedTicket.type,
      });
      setDesks((ds) => ds.map((d) => (d.id === deskId ? { ...d, current: null } : d)));
      onTicketStatusChange?.(finishedTicket.id, "completed", { deskId });
      setCompletingDesk(null);
      setJustRevealedDesk(deskId);
      setTimeout(() => setJustRevealedDesk(null), 600);
    }, 480);
  };

  const skipTicket = (deskId) => {
    const desk = desks.find((d) => d.id === deskId);
    if (!desk || !desk.current) return;
    const ticket = desk.current;
    const skippedAt = Date.now();
    // Trigger fade-down exit animation first, then commit state after it runs
    setSkippingDesk(deskId);
    setTimeout(() => {
      onTicketSkipped({
        id: ticket.id,
        label: ticket.label,
        type: ticket.type,
        name: ticket.name,
        phone: ticket.phone,
        serviceId: ticket.serviceId,
        createdAt: ticket.createdAt,
        skippedAt,
        skippedFromDesk: deskId,
      });
      setDesks((ds) => ds.map((d) => (d.id === deskId ? { ...d, current: null } : d)));
      onTicketStatusChange?.(ticket.id, "skipped", { deskId });
      setSkippingDesk(null);
      setJustRevealedDesk(deskId);
      setTimeout(() => setJustRevealedDesk(null), 600);
    }, 480);
  };

  const addDesk = (name, deskWord, serviceIds, details = {}) => {
    const serviceSource = Array.isArray(serviceIds) ? serviceIds : [DEFAULT_SERVICE_ID];
    const assignedServices = Array.from(new Set(serviceSource)).filter(Boolean);
    const id = Date.now();
    setDesks((ds) => [
      ...ds,
      {
        id,
        name: name || `${deskWord} ${ds.length + 1}`,
        services: assignedServices,
        current: null,
        locked: false,
        status: "Available",
        ...details,
      },
    ]);
    return id;
  };

  const removeDesk = (deskId, { onBeforeRemove } = {}) => {
    if (deskId === DEFAULT_DESK_ID || desks.length <= 1) return;
    const desk = desks.find((d) => d.id === deskId);
    if (desk && desk.current) {
      setQueue((q) => [desk.current, ...q]);
      onTicketStatusChange?.(desk.current.id, "queued", { deskId: null });
    }
    setDesks((ds) => ds.filter((d) => d.id !== deskId));
    onBeforeRemove?.(deskId);
  };

  const renameDesk = (deskId, name) => {
    setDesks((ds) => ds.map((d) => (d.id === deskId ? { ...d, name } : d)));
  };

  const updateDesk = (deskId, updates) => {
    setDesks((ds) => ds.map((d) => (d.id === deskId ? { ...d, ...updates } : d)));
  };

  const setDeskServices = (deskId, serviceIds) => {
    const nextServices = Array.from(new Map((Array.isArray(serviceIds) ? serviceIds : []).filter(Boolean).map((id) => [String(id), id])).values());
    setDesks((ds) => ds.map((d) => (String(d.id) === String(deskId) ? { ...d, services: nextServices } : d)));
  };

  const toggleDeskLock = (deskId) => {
    setDesks((ds) => ds.map((d) => (d.id === deskId ? { ...d, locked: !d.locked } : d)));
  };

  const toggleDeskService = (deskId, serviceId) => {
    setDesks((ds) =>
      ds.map((d) => {
        if (String(d.id) !== String(deskId)) return d;
        const currentServices = Array.isArray(d.services) ? d.services : [];
        const has = currentServices.map(String).includes(String(serviceId));
        return { ...d, services: has ? currentServices.filter((s) => String(s) !== String(serviceId)) : [...currentServices, serviceId] };
      })
    );
  };

  const setServiceDesks = (serviceId, deskIds) => {
    const targetDeskIds = new Set((Array.isArray(deskIds) ? deskIds : []).map(String));
    setDesks((ds) =>
      ds.map((d) => {
        const currentServices = Array.isArray(d.services) ? d.services : [];
        const shouldHaveService = targetDeskIds.has(String(d.id));
        const hasService = currentServices.map(String).includes(String(serviceId));

        if (shouldHaveService === hasService) return d;

        return {
          ...d,
          services: shouldHaveService
            ? Array.from(new Map([...currentServices, serviceId].map((id) => [String(id), id])).values())
            : currentServices.filter((id) => String(id) !== String(serviceId)),
        };
      })
    );
  };

  const removeServiceFromDesks = (serviceId) => {
    setDesks((ds) => ds.map((d) => ({ ...d, services: (Array.isArray(d.services) ? d.services : []).filter((id) => String(id) !== String(serviceId)) })));
  };

  const clearDeskTickets = () => {
    setDesks((ds) => ds.map((d) => ({ ...d, current: null })));
  };

  return {
    desks,
    setDesks,
    completingDesk,
    startingDesk,
    justRevealedDesk,
    skippingDesk,
    callNext,
    startService,
    completeTicket,
    skipTicket,
    addDesk,
    removeDesk,
    renameDesk,
    updateDesk,
    setDeskServices,
    toggleDeskLock,
    toggleDeskService,
    setServiceDesks,
    removeServiceFromDesks,
    clearDeskTickets,
  };
}
