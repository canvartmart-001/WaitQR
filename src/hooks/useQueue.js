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
export const eligibleForDesk = (desk) => (t) => {
  if (t.deskId != null) return String(t.deskId) === String(desk.id);
  // A service ticket without an authoritative assignment must not be duplicated
  // across every counter that offers the service.
  return !t.serviceId;
};

// A ticket counts as priority-ranked unless it's been tagged _skipPriority — used when an
// operator deliberately switches away from a called priority ticket, so it doesn't immediately
// leapfrog back to the front purely by virtue of being priority-type.
export const isPriorityRanked = (t) => t.type === "priority" && !t._skipPriority;

// Sort rank: ranked priority tickets first (tier 0), everything else (skipped priority and
// general tickets) ties at tier 1 — so a skipped ticket never outranks the general ticket an
// operator just switched to, but a brand-new priority ticket still jumps ahead of a skipped one.
export const queueRank = (t) => (isPriorityRanked(t) ? 0 : 1);

export function selectNextTicketForDesk(queue, desk) {
  const candidates = queue.filter(eligibleForDesk(desk));
  if (candidates.length === 0) return null;

  return candidates
    .map((ticket, index) => ({ ticket, index }))
    .sort((a, b) => {
      const rankDifference = queueRank(a.ticket) - queueRank(b.ticket);
      if (rankDifference !== 0) return rankDifference;

      const aCreatedAt = Number(a.ticket.createdAt);
      const bCreatedAt = Number(b.ticket.createdAt);
      if (Number.isFinite(aCreatedAt) && Number.isFinite(bCreatedAt) && aCreatedAt !== bCreatedAt) {
        return aCreatedAt - bCreatedAt;
      }

      return a.index - b.index;
    })[0].ticket;
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
    rotationDesk = desk;
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
