import { useState } from "react";

// >>> BACKEND INTEGRATION NOTE <<<
// servedLog/absentList/removedLog are append-mostly history tables — a natural fit for real
// Postgres tables (served_tickets, absent_tickets, removed_tickets) once the backend exists. The
// breakdown aggregation below (servedByDesk, absentByService, etc.) is cheap client-side math for
// a small in-memory list; once this data lives in Postgres it likely becomes a GROUP BY query
// instead, and this function would just consume the pre-aggregated result from the API.

export function useTicketLogs(initialServedLog, initialAbsentList, initialRemovedLog) {
  const [servedLog, setServedLog] = useState(initialServedLog);
  const [absentList, setAbsentList] = useState(initialAbsentList);
  const [removedLog, setRemovedLog] = useState(initialRemovedLog);

  const addServedEntry = (entry) => setServedLog((log) => [...log, entry]);
  const addAbsentEntry = (entry) => setAbsentList((list) => [...list, entry]);
  const hydrateLogs = ({ served = [], absent = [], removed = [] }) => {
    setServedLog(served);
    setAbsentList(absent);
    setRemovedLog(removed);
  };

  /** Plain removal — no removed-log entry. Used by returnToQueue, where the ticket is going back
   * into circulation rather than being discarded. Contrast with removeAbsent below, which is the
   * "delete forever" action and does log to removedLog. */
  const removeAbsentSilently = (ticketId) => {
    setAbsentList((list) => list.filter((t) => t.id !== ticketId));
  };

  const removeAbsent = (ticketId) => {
    const ticket = absentList.find((t) => t.id === ticketId);
    if (ticket) {
      setRemovedLog((log) => [
        ...log,
        {
          deskId: ticket.skippedFromDesk,
          serviceId: ticket.serviceId,
          removedAt: Date.now(),
          label: ticket.label,
          name: ticket.name,
          type: ticket.type,
        },
      ]);
    }
    setAbsentList((list) => list.filter((t) => t.id !== ticketId));
    return ticket;
  };

  const clearLogs = () => {
    setServedLog([]);
    setAbsentList([]);
    setRemovedLog([]);
  };

  const sortedServed = [...servedLog].sort((a, b) => b.completedAt - a.completedAt);

  // Per-desk and per-service breakdowns, used by the stats strip and the per-desk detail panel.
  const servedByDesk = {};
  const absentByDesk = {};
  const removedByDesk = {};
  servedLog.forEach((e) => {
    servedByDesk[e.deskId] = (servedByDesk[e.deskId] || 0) + 1;
  });
  absentList.forEach((t) => {
    if (t.skippedFromDesk != null) {
      absentByDesk[t.skippedFromDesk] = (absentByDesk[t.skippedFromDesk] || 0) + 1;
    }
  });
  removedLog.forEach((e) => {
    removedByDesk[e.deskId] = (removedByDesk[e.deskId] || 0) + 1;
  });

  const servedByService = {};
  const absentByService = {};
  const removedByService = {};
  const servedByDeskService = {};
  const absentByDeskService = {};
  const removedByDeskService = {};
  servedLog.forEach((e) => {
    servedByService[e.serviceId] = (servedByService[e.serviceId] || 0) + 1;
    const key = `${e.deskId}|${e.serviceId}`;
    servedByDeskService[key] = (servedByDeskService[key] || 0) + 1;
  });
  absentList.forEach((t) => {
    absentByService[t.serviceId] = (absentByService[t.serviceId] || 0) + 1;
    if (t.skippedFromDesk != null) {
      const key = `${t.skippedFromDesk}|${t.serviceId}`;
      absentByDeskService[key] = (absentByDeskService[key] || 0) + 1;
    }
  });
  removedLog.forEach((e) => {
    removedByService[e.serviceId] = (removedByService[e.serviceId] || 0) + 1;
    if (e.deskId != null) {
      const key = `${e.deskId}|${e.serviceId}`;
      removedByDeskService[key] = (removedByDeskService[key] || 0) + 1;
    }
  });

  const avgWaitMs = servedLog.length ? servedLog.reduce((a, b) => a + b.waitMs, 0) / servedLog.length : 0;

  return {
    servedLog,
    absentList,
    removedLog,
    addServedEntry,
    addAbsentEntry,
    hydrateLogs,
    removeAbsent,
    removeAbsentSilently,
    clearLogs,
    sortedServed,
    avgWaitMs,
    servedByDesk,
    absentByDesk,
    removedByDesk,
    servedByService,
    absentByService,
    removedByService,
    servedByDeskService,
    absentByDeskService,
    removedByDeskService,
  };
}
