// Small composition hook: the "return an absent ticket to the queue" action touches both
// absentList and queue, so it can't live cleanly inside useTicketLogs or useQueue alone without
// one importing the other. Keeping it here keeps both of those hooks single-purpose.

export function useAbsentActions({ absentList, setQueue, removeAbsentSilently, onTicketReturned }) {
  const returnToQueue = (ticketId, type) => {
    const ticket = absentList.find((t) => t.id === ticketId);
    if (!ticket) return;
    setQueue((q) => [
      ...q,
      {
        id: ticket.id,
        label: ticket.label,
        type,
        name: ticket.name,
        phone: ticket.phone,
        serviceId: ticket.serviceId,
        createdAt: ticket.createdAt,
      },
    ]);
    removeAbsentSilently(ticketId);
    onTicketReturned?.(ticket.id);
  };

  return { returnToQueue };
}
