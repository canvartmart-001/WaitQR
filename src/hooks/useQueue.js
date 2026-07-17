import { useState } from "react";

// >>> BACKEND INTEGRATION NOTE <<<
// This hook is the seam for swapping local state for the real backend. Today it's a thin
// useState wrapper seeded with fake data. Later, `queue` should come from a socket subscription
// (e.g. socket.on("queue:sync", setQueue)) instead of local state, and setQueue should become
// "optimistically update, then emit an event the server will confirm/correct" rather than the
// final source of truth. The functions below (isPriorityRanked, queueRank, eligibleForDesk) are
// pure business logic with no React dependency, so they can move server-side unchanged if ranking
// ever needs to be authoritative there instead of client-computed.

/** Service tickets require an explicit desk assignment; general tickets can use any desk. */
export const eligibleForDesk = (desk) => (t) => !t.serviceId || desk.services.includes(t.serviceId);

// A ticket counts as priority-ranked unless it's been tagged _skipPriority — used when an
// operator deliberately switches away from a called priority ticket, so it doesn't immediately
// leapfrog back to the front purely by virtue of being priority-type.
export const isPriorityRanked = (t) => t.type === "priority" && !t._skipPriority;

// Sort rank: ranked priority tickets first (tier 0), everything else (skipped priority and
// general tickets) ties at tier 1 — so a skipped ticket never outranks the general ticket an
// operator just switched to, but a brand-new priority ticket still jumps ahead of a skipped one.
export const queueRank = (t) => (isPriorityRanked(t) ? 0 : 1);

const GENERAL_SERVICE_KEY = "__general__";

function ticketServiceKey(ticket) {
  return ticket.serviceId || GENERAL_SERVICE_KEY;
}

function serviceRotationOrder(desk) {
  const assignedServices = Array.isArray(desk.services) ? desk.services : [];
  return assignedServices.length > 0 ? assignedServices : [GENERAL_SERVICE_KEY];
}

export function selectNextTicketForDesk(queue, desk) {
  const candidates = queue.filter(eligibleForDesk(desk));
  if (candidates.length === 0) return null;

  const rotationOrder = serviceRotationOrder(desk);
  const lastServiceId = desk.lastServiceId || null;
  const lastIndex = lastServiceId ? rotationOrder.indexOf(lastServiceId) : -1;
  const orderedServices = [
    ...rotationOrder.slice(lastIndex + 1),
    ...rotationOrder.slice(0, lastIndex + 1),
  ];

  for (const serviceId of orderedServices) {
    const serviceCandidates = candidates.filter((ticket) => ticketServiceKey(ticket) === serviceId);
    if (serviceCandidates.length === 0) continue;

    return [...serviceCandidates].sort((a, b) => queueRank(a) - queueRank(b))[0];
  }

  return [...candidates].sort((a, b) => queueRank(a) - queueRank(b))[0];
}

export function selectNextTicketsForDesk(queue, desk, count = 2) {
  const selected = [];
  let remainingQueue = queue;
  let rotationDesk = desk;

  while (selected.length < count) {
    const next = selectNextTicketForDesk(remainingQueue, rotationDesk);
    if (!next) break;

    selected.push(next);
    remainingQueue = remainingQueue.filter((ticket) => ticket.id !== next.id);
    rotationDesk = { ...rotationDesk, lastServiceId: ticketServiceKey(next) };
  }

  return selected;
}

export function orderTicketsForDesk(queue, desk) {
  return selectNextTicketsForDesk(queue, desk, queue.length);
}

export function useQueue(initialQueue) {
  const [queue, setQueue] = useState(initialQueue);

  const nextForDesk = (desk) => {
    return selectNextTicketForDesk(queue, desk);
  };

  const nextTwoForDesk = (desk) => {
    return selectNextTicketsForDesk(queue, desk, 2);
  };

  const sortedQueue = [...queue].sort((a, b) => queueRank(a) - queueRank(b));

  return { queue, setQueue, nextForDesk, nextTwoForDesk, sortedQueue };
}
