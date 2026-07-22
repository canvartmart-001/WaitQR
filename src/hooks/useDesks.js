import { useState } from "react";
import { selectNextTicketForDesk } from "./useQueue";

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
  const [completingTicket, setCompletingTicket] = useState(null);
  const [startingDesk, setStartingDesk] = useState(null);
  const [startingTicket, setStartingTicket] = useState(null);
  const [justRevealedDesk, setJustRevealedDesk] = useState(null);
  const [justRevealedTicket, setJustRevealedTicket] = useState(null);
  const [skippingDesk, setSkippingDesk] = useState(null);
  const [skippingTicket, setSkippingTicket] = useState(null);

  const callTicket = (deskId, ticketId = null) => {
    const desk = desks.find((d) => d.id === deskId);
    if (!desk) return;
    const best = selectNextTicketForDesk(queue, desk);
    if (!best || (ticketId != null && String(best.id) !== String(ticketId))) return;
    const idx = queue.findIndex((t) => t.id === best.id);
    const { _skipPriority, ...ticket } = queue[idx];
    const rest = [...queue.slice(0, idx), ...queue.slice(idx + 1)];
    setQueue(rest);
    const calledTicket = { ...ticket, calledAt: Date.now(), startedAt: null };
    setDesks((ds) =>
      ds.map((d) =>
        d.id === deskId
          ? {
              ...d,
              current: d.current || calledTicket,
              calledTickets: d.current ? [...(Array.isArray(d.calledTickets) ? d.calledTickets : []), calledTicket] : (Array.isArray(d.calledTickets) ? d.calledTickets : []),
              lastServiceId: ticket.serviceId || "__general__",
            }
          : d
      )
    );
    onTicketStatusChange?.(ticket.id, "called", { deskId });
  };

  const callNext = (deskId) => callTicket(deskId);

  const startService = (deskId) => {
    const currentTicketId = desks.find((d) => d.id === deskId)?.current?.id || null;
    setStartingDesk(deskId);
    setStartingTicket(currentTicketId);
    // Brief delay so play-out animation is visible before timer renders
    setTimeout(() => {
      const currentDesk = desks.find((d) => d.id === deskId);
      const current = currentDesk?.current;
      setDesks((ds) =>
        ds.map((d) =>
          d.id === deskId && d.current && !d.current.startedAt
            ? { ...d, current: { ...d.current, startedAt: Date.now() } }
            : d
        )
      );
      if (current) onTicketStatusChange?.(current.id, "serving", { deskId });
      setStartingDesk(null);
      setStartingTicket(null);
    }, 280);
  };

  const startTicketService = (deskId, ticketId) => {
    if (!ticketId) {
      startService(deskId);
      return;
    }

    const desk = desks.find((d) => String(d.id) === String(deskId));
    const ticket = [desk?.current, ...(Array.isArray(desk?.calledTickets) ? desk.calledTickets : [])]
      .filter(Boolean)
      .find((item) => String(item.id) === String(ticketId));
    if (!ticket || ticket.startedAt) return;

    setStartingDesk(deskId);
    setStartingTicket(ticket.id);
    setTimeout(() => {
      const startedAt = Date.now();
      setDesks((ds) =>
        ds.map((d) => {
          if (String(d.id) !== String(deskId)) return d;
          if (d.current && String(d.current.id) === String(ticketId)) {
            return { ...d, current: { ...d.current, startedAt } };
          }
          return {
            ...d,
            calledTickets: (Array.isArray(d.calledTickets) ? d.calledTickets : []).map((item) =>
              String(item.id) === String(ticketId) ? { ...item, startedAt } : item
            ),
          };
        })
      );
      onTicketStatusChange?.(ticket.id, "serving", { deskId });
      setStartingDesk(null);
      setStartingTicket(null);
    }, 280);
  };

  const completeTicket = (deskId) => {
    const desk = desks.find((d) => d.id === deskId);
    if (!desk || !desk.current) return;
    const waitMs = desk.current.calledAt - desk.current.createdAt;
    const finishedTicket = desk.current;
    // Trigger exit animation first, then commit state after it runs
    setCompletingDesk(deskId);
    setCompletingTicket(finishedTicket.id);
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
        createdAt: finishedTicket.createdAt,
      });
      setDesks((ds) =>
        ds.map((d) => {
          if (d.id !== deskId) return d;
          const [nextCurrent = null, ...remainingCalled] = Array.isArray(d.calledTickets) ? d.calledTickets : [];
          return { ...d, current: nextCurrent, calledTickets: remainingCalled };
        })
      );
      onTicketStatusChange?.(finishedTicket.id, "completed", { deskId });
      setCompletingDesk(null);
      setCompletingTicket(null);
      setJustRevealedDesk(deskId);
      setJustRevealedTicket(null);
      setTimeout(() => {
        setJustRevealedDesk(null);
        setJustRevealedTicket(null);
      }, 600);
    }, 480);
  };

  const completeActiveTicket = (deskId, ticketId = null) => {
    if (!ticketId) {
      completeTicket(deskId);
      return;
    }

    const desk = desks.find((d) => String(d.id) === String(deskId));
    const activeTickets = [desk?.current, ...(Array.isArray(desk?.calledTickets) ? desk.calledTickets : [])].filter(Boolean);
    const finishedTicket = activeTickets.find((ticket) => String(ticket.id) === String(ticketId));
    if (!desk || !finishedTicket) return;
    const waitMs = finishedTicket.calledAt - finishedTicket.createdAt;

    setCompletingDesk(deskId);
    setCompletingTicket(finishedTicket.id);
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
        createdAt: finishedTicket.createdAt,
      });
      setDesks((ds) =>
        ds.map((d) => {
          if (String(d.id) !== String(deskId)) return d;
          if (d.current && String(d.current.id) === String(ticketId)) {
            const [nextCurrent = null, ...remainingCalled] = Array.isArray(d.calledTickets) ? d.calledTickets : [];
            return { ...d, current: nextCurrent, calledTickets: remainingCalled };
          }
          return {
            ...d,
            calledTickets: (Array.isArray(d.calledTickets) ? d.calledTickets : []).filter((ticket) => String(ticket.id) !== String(ticketId)),
          };
        })
      );
      onTicketStatusChange?.(finishedTicket.id, "completed", { deskId });
      setCompletingDesk(null);
      setCompletingTicket(null);
      const nextTicketId = desk.current && String(desk.current.id) === String(ticketId)
        ? (Array.isArray(desk.calledTickets) ? desk.calledTickets[0]?.id : null)
        : null;
      setJustRevealedDesk(deskId);
      setJustRevealedTicket(nextTicketId || null);
      setTimeout(() => {
        setJustRevealedDesk(null);
        setJustRevealedTicket(null);
      }, 600);
    }, 480);
  };

  const skipTicket = (deskId) => {
    const desk = desks.find((d) => d.id === deskId);
    if (!desk || !desk.current) return;
    const ticket = desk.current;
    const skippedAt = Date.now();
    // Trigger fade-down exit animation first, then commit state after it runs
    setSkippingDesk(deskId);
    setSkippingTicket(ticket.id);
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
      setDesks((ds) =>
        ds.map((d) => {
          if (d.id !== deskId) return d;
          const [nextCurrent = null, ...remainingCalled] = Array.isArray(d.calledTickets) ? d.calledTickets : [];
          return { ...d, current: nextCurrent, calledTickets: remainingCalled };
        })
      );
      onTicketStatusChange?.(ticket.id, "skipped", { deskId });
      setSkippingDesk(null);
      setSkippingTicket(null);
      setJustRevealedDesk(deskId);
      setJustRevealedTicket(null);
      setTimeout(() => {
        setJustRevealedDesk(null);
        setJustRevealedTicket(null);
      }, 600);
    }, 480);
  };

  const skipActiveTicket = (deskId, ticketId = null) => {
    if (!ticketId) {
      skipTicket(deskId);
      return;
    }

    const desk = desks.find((d) => String(d.id) === String(deskId));
    const ticket = [desk?.current, ...(Array.isArray(desk?.calledTickets) ? desk.calledTickets : [])]
      .filter(Boolean)
      .find((item) => String(item.id) === String(ticketId));
    if (!desk || !ticket) return;
    const skippedAt = Date.now();

    setSkippingDesk(deskId);
    setSkippingTicket(ticket.id);
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
      setDesks((ds) =>
        ds.map((d) => {
          if (String(d.id) !== String(deskId)) return d;
          if (d.current && String(d.current.id) === String(ticketId)) {
            const [nextCurrent = null, ...remainingCalled] = Array.isArray(d.calledTickets) ? d.calledTickets : [];
            return { ...d, current: nextCurrent, calledTickets: remainingCalled };
          }
          return {
            ...d,
            calledTickets: (Array.isArray(d.calledTickets) ? d.calledTickets : []).filter((item) => String(item.id) !== String(ticketId)),
          };
        })
      );
      onTicketStatusChange?.(ticket.id, "skipped", { deskId });
      setSkippingDesk(null);
      setSkippingTicket(null);
      const nextTicketId = desk.current && String(desk.current.id) === String(ticketId)
        ? (Array.isArray(desk.calledTickets) ? desk.calledTickets[0]?.id : null)
        : null;
      setJustRevealedDesk(deskId);
      setJustRevealedTicket(nextTicketId || null);
      setTimeout(() => {
        setJustRevealedDesk(null);
        setJustRevealedTicket(null);
      }, 600);
    }, 480);
  };

  const addDesk = (name, deskWord, serviceIds, details = {}) => {
    const serviceSource = Array.isArray(serviceIds) ? serviceIds : [];
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
    const desk = desks.find((d) => d.id === deskId);
    const calledTickets = Array.isArray(desk?.calledTickets) ? desk.calledTickets : [];
    const activeTickets = [desk?.current, ...calledTickets].filter(Boolean);
    if (activeTickets.length > 0) {
      setQueue((q) => [...activeTickets, ...q]);
      activeTickets.forEach((ticket) => onTicketStatusChange?.(ticket.id, "queued", { deskId: null }));
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
    setDesks((ds) => ds.map((d) => ({ ...d, current: null, calledTickets: [] })));
  };

  return {
    desks,
    setDesks,
    completingDesk,
    completingTicket,
    startingDesk,
    startingTicket,
    justRevealedDesk,
    justRevealedTicket,
    skippingDesk,
    skippingTicket,
    callNext,
    callTicket,
    startService,
    startTicketService,
    completeTicket,
    completeActiveTicket,
    skipTicket,
    skipActiveTicket,
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
