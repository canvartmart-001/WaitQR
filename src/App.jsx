import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_DESK_ID, DEFAULT_SERVICE_ID, DEFAULT_SERVICES, seedQueue, seedDesks, seedServedLog, seedAbsentList, seedRemovedLog, seedMembers } from "./lib/seedData";
import { useClock } from "./hooks/useClock";
import { useQueue, eligibleForDesk, orderTicketsForDesk } from "./hooks/useQueue";
import { useDesks } from "./hooks/useDesks";
import { useServices } from "./hooks/useServices";
import { useMembers } from "./hooks/useMembers";
import { useTicketLogs } from "./hooks/useTicketLogs";
import { useTicketIssuer } from "./hooks/useTicketIssuer";
import { useAbsentActions } from "./hooks/useAbsentActions";
import { useLabels } from "./hooks/useLabels";
import { useConfirmDialog } from "./hooks/useConfirmDialog";
import { AdminShell } from "./components/admin/AdminShell";
import { StatsStrip } from "./components/layout/StatsStrip";
import { BreakdownTabsSection } from "./components/layout/BreakdownTabsSection";
import { LivePage } from "./components/liveboard/LivePage";
import { DeskPage } from "./components/deskconsole/DeskPage";
import { CreatePage } from "./components/kiosk/CreatePage";
import { TicketPage } from "./components/kiosk/TicketPage";
import { AdminAnalyticsPage } from "./components/admin/analytics/AdminAnalyticsPage";
import { AdminCountersPage } from "./components/admin/counters/AdminCountersPage";
import { AdminServicesPage } from "./components/admin/services/AdminServicesPage";
import { AdminMembersPage } from "./components/admin/members/AdminMembersPage";
import { AdminSettingsPage } from "./components/admin/settings/AdminSettingsPage";
import { ConfirmDialog } from "./components/modals/ConfirmDialog";
import { IssueToast } from "./components/shared/IssueToast";
import { C } from "./lib/theme";
import { findDeskByPath, findTicketLabelByPath, getDeskPath, getTicketPath } from "./lib/routing";
import { clearSubmissions, listQueueCountEvents, listSubmissions, updateSubmissionStatus } from "./lib/submissionsApi";
import { cacheSettings, loadSettings, saveSettings } from "./lib/settingsApi";
import { createRealtimeClient } from "./lib/realtime";
import { deriveDeskServicesFromMembers, normalizeMemberRole, uniqueIds } from "./lib/assignments";

const DASHBOARD_BREAKDOWN_MIN_HEIGHT = 640;
const DEFAULT_APPEARANCE_SETTINGS = {
  systemName: "WaitQR",
  accentColor: "#2563eb",
  bgColor: "#04060b",
  fontColor: "#e2e8f0",
  borderColor: "#171d2b",
  separatorColor: "#171d2b",
  radius: 12,
  logoUrl: null,
  themeMode: "Dark",
  themeColors: {
    Dark: {
      accentColor: "#2563eb",
      bgColor: "#04060b",
      fontColor: "#e2e8f0",
      borderColor: "#171d2b",
      separatorColor: "#171d2b",
    },
    Light: {
      accentColor: "#2563eb",
      bgColor: "#f8fafc",
      fontColor: "#0f172a",
      borderColor: "#e2e8f0",
      separatorColor: "#e2e8f0",
    },
  },
};
const APPEARANCE_STORAGE_KEY = "waitqr:appearance";

function normalizeAppearance(appearance) {
  const source = appearance && typeof appearance === "object" ? appearance : {};
  return {
    ...DEFAULT_APPEARANCE_SETTINGS,
    ...source,
    themeColors: {
      Dark: {
        ...DEFAULT_APPEARANCE_SETTINGS.themeColors.Dark,
        ...(source.themeColors?.Dark || {}),
      },
      Light: {
        ...DEFAULT_APPEARANCE_SETTINGS.themeColors.Light,
        ...(source.themeColors?.Light || {}),
      },
    },
  };
}

function loadStoredAppearance() {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE_SETTINGS;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) || "null");
    return normalizeAppearance(parsed);
  } catch (error) {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
}

function storeAppearance(appearance) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
  } catch (error) {
    console.warn("Failed to store appearance settings locally.", error);
  }
}

function submissionToTicket(submission) {
  return {
    id: submission.id,
    label: submission.label,
    type: submission.type,
    name: submission.name,
    phone: submission.phone,
    serviceId: submission.serviceId || "",
    createdAt: submission.createdAt,
  };
}

function submissionToDeskTicket(submission) {
  return {
    ...submissionToTicket(submission),
    deskId: submission.deskId == null ? null : String(submission.deskId),
    calledAt: submission.calledAt || submission.statusUpdatedAt || submission.createdAt,
    startedAt: submission.status === "serving" ? submission.startedAt || submission.statusUpdatedAt || submission.createdAt : null,
  };
}

function summarizeSubmissions(submissions) {
  return submissions.reduce(
    (summary, submission) => {
      summary.total += 1;

      if (submission.status === "queued" || submission.status === "called") {
        summary.waiting += 1;
      } else if (submission.status === "serving") {
        summary.serving += 1;
      } else if (submission.status === "completed") {
        summary.served += 1;
      } else if (submission.status === "skipped" || submission.status === "removed") {
        summary.absent += 1;
      }

      return summary;
    },
    { total: 0, waiting: 0, serving: 0, served: 0, absent: 0 }
  );
}

function mapSubmissionToServedEntry(submission) {
  const completedAt = submission.statusUpdatedAt || submission.createdAt;

  return {
    id: submission.id,
    deskId: submission.deskId == null ? null : String(submission.deskId),
    serviceId: submission.serviceId || "",
    label: submission.label,
    name: submission.name,
    phone: submission.phone,
    type: submission.type,
    completedAt,
    waitMs: Math.max(0, (submission.calledAt || completedAt) - submission.createdAt),
  };
}

function mapSubmissionToAbsentEntry(submission) {
  const skippedAt = submission.statusUpdatedAt || submission.createdAt;

  return {
    id: submission.id,
    label: submission.label,
    type: submission.type,
    name: submission.name,
    phone: submission.phone,
    serviceId: submission.serviceId || "",
    createdAt: submission.createdAt,
    skippedAt,
    skippedFromDesk: submission.deskId == null ? null : String(submission.deskId),
  };
}

function mapSubmissionToRemovedEntry(submission) {
  return {
    id: submission.id,
    deskId: submission.deskId == null ? null : String(submission.deskId),
    serviceId: submission.serviceId || "",
    removedAt: submission.statusUpdatedAt || submission.createdAt,
    label: submission.label,
    name: submission.name,
    type: submission.type,
  };
}

function assignActiveTicketsToDesks(desks, activeSubmissions) {
  if (activeSubmissions.length === 0) return desks;

  const activeTickets = activeSubmissions.map(submissionToDeskTicket);
  const ticketsByDeskId = new Map(
    activeTickets
      .filter((ticket) => ticket.deskId != null)
      .map((ticket) => [String(ticket.deskId), ticket]),
  );
  const unassignedTickets = activeTickets.filter((ticket) => ticket.deskId == null);

  return desks.map((desk) => {
    const ticket = ticketsByDeskId.get(String(desk.id)) || unassignedTickets.shift() || null;
    if (!ticket) return desk;
    return { ...desk, current: ticket };
  });
}

function hydrateSubmissionSnapshot(submissions, { services, setSavedSubmissions, setSubmissionSummary, setIssuedToday, ticketLogs, activeSubmissionsRef, setDesks, setQueue }) {
  setSavedSubmissions(submissions);
  const summary = summarizeSubmissions(submissions);
  setSubmissionSummary(summary);
  setIssuedToday(summary.total);
  ticketLogs.hydrateLogs({
    served: submissions.filter((submission) => submission.status === "completed").map(mapSubmissionToServedEntry),
    absent: submissions.filter((submission) => submission.status === "skipped").map(mapSubmissionToAbsentEntry),
    removed: submissions.filter((submission) => submission.status === "removed").map(mapSubmissionToRemovedEntry),
  });

  activeSubmissionsRef.current = submissions
    .filter((submission) => submission.status === "called" || submission.status === "serving")
    .sort((a, b) => (a.calledAt || a.statusUpdatedAt) - (b.calledAt || b.statusUpdatedAt));

  setDesks((currentDesks) => assignActiveTicketsToDesks(sanitizeDesksForSettings(currentDesks, services), activeSubmissionsRef.current));
  setQueue(
    submissions
      .filter((submission) => submission.status === "queued")
      .sort((a, b) => a.createdAt - b.createdAt)
      .map(submissionToTicket),
  );
}

function moveSummaryStatus(summary, previousStatus, nextStatus) {
  const next = { ...summary };
  const decrement = (status) => {
    if (status === "queued" || status === "called") next.waiting = Math.max(0, next.waiting - 1);
    if (status === "serving") next.serving = Math.max(0, next.serving - 1);
    if (status === "completed") next.served = Math.max(0, next.served - 1);
    if (status === "skipped" || status === "removed") next.absent = Math.max(0, next.absent - 1);
  };
  const increment = (status) => {
    if (status === "queued" || status === "called") next.waiting += 1;
    if (status === "serving") next.serving += 1;
    if (status === "completed") next.served += 1;
    if (status === "skipped" || status === "removed") next.absent += 1;
  };

  decrement(previousStatus);
  increment(nextStatus);

  return next;
}

function normalizeServicesForSettings(services = []) {
  const savedServices = Array.isArray(services) ? services : [];

  return savedServices
    .filter((service) => service && service.id !== DEFAULT_SERVICE_ID && !service.isDefault)
    .map((service) => ({ ...service, isDefault: false }));
}

function normalizeDesksForSettings(desks = [], services = DEFAULT_SERVICES, { preserveCurrent = false } = {}) {
  const savedDesks = (Array.isArray(desks) ? desks : []).filter((desk) => desk && desk.id !== DEFAULT_DESK_ID && !desk.isDefault);
  const serviceIds = new Set(normalizeServicesForSettings(services).map((service) => service.id));
  const normalizeDeskServices = (desk, fallbackServices = []) => {
    if (!Array.isArray(desk.services)) {
      return fallbackServices.filter((serviceId) => serviceIds.has(serviceId));
    }

    return Array.from(new Set(desk.services)).filter((serviceId) => serviceIds.has(serviceId));
  };

  return savedDesks.map((desk) => ({
    ...desk,
    services: normalizeDeskServices(desk),
    status: desk.status || "Available",
    current: preserveCurrent ? desk.current || null : null,
    isDefault: Boolean(desk.isDefault),
  }));
}

function reconcileDeskServiceAssignments(desks, services, options) {
  return normalizeDesksForSettings(desks, normalizeServicesForSettings(services), options);
}

function sanitizeDesksForSettings(desks, services) {
  return reconcileDeskServiceAssignments(desks, services).map((desk) => ({
    id: desk.id,
    name: desk.name,
    services: desk.services || [],
    locked: Boolean(desk.locked),
    status: desk.status || "Available",
    current: null,
    isDefault: Boolean(desk.isDefault),
  }));
}

function normalizeMembersForSettings(members = [], desks = [], services = DEFAULT_SERVICES) {
  const savedMembers = Array.isArray(members) ? members : [];
  const deskById = new Map((Array.isArray(desks) ? desks : []).map((desk) => [String(desk.id), desk.id]));
  const serviceById = new Map(normalizeServicesForSettings(services).map((service) => [String(service.id), service.id]));
  const legacyServiceIdsForDesks = (deskIds = []) =>
    uniqueIds(deskIds)
      .flatMap((deskId) => {
        const desk = (Array.isArray(desks) ? desks : []).find((item) => String(item.id) === String(deskId));
        return uniqueIds(desk?.services);
      })
      .map((serviceId) => serviceById.get(String(serviceId)))
      .filter(Boolean);

  return savedMembers
    .map((member) => {
      const id = String(member?.id || member?.employeeId || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);
      const deskIds = Array.from(
        new Map(
          (Array.isArray(member?.deskIds) ? member.deskIds : [])
            .filter((deskId) => deskId != null && deskById.has(String(deskId)))
            .map((deskId) => [String(deskId), deskById.get(String(deskId))])
        ).values()
      );
      const explicitServiceIds = uniqueIds(member?.serviceIds)
        .map((serviceId) => serviceById.get(String(serviceId)))
        .filter(Boolean);
      const serviceIds = explicitServiceIds.length > 0 ? explicitServiceIds : legacyServiceIdsForDesks(deskIds);

      return {
        id,
        name: String(member?.name || "").trim(),
        phone: String(member?.phone || "").replace(/\D/g, ""),
        password: String(member?.password || ""),
        photo: member?.photo || null,
        about: String(member?.about || "").trim(),
        role: normalizeMemberRole(member?.role),
        email: String(member?.email || "").trim(),
        status: member?.status === "Inactive" ? "Inactive" : "Active",
        deskIds,
        serviceIds: uniqueIds(serviceIds),
      };
    })
    .filter((member) => member.id && member.name);
}

function createSettingsPayload({ services, desks, members, appearance }) {
  const normalizedServices = normalizeServicesForSettings(services);
  const normalizedMembers = normalizeMembersForSettings(members, desks, normalizedServices);
  const normalizedDesks = sanitizeDesksForSettings(
    deriveDeskServicesFromMembers(desks, normalizedMembers, normalizedServices, { preserveWithoutMembers: normalizedMembers.length === 0 }),
    normalizedServices
  );
  return {
    services: normalizedServices,
    desks: normalizedDesks,
    members: normalizeMembersForSettings(normalizedMembers, normalizedDesks, normalizedServices),
    appearance,
  };
}

function findSubmissionByLabel(label, { savedSubmissions, queue, desks }) {
  if (!label) return null;
  const normalized = String(label).toUpperCase();

  const savedMatch = savedSubmissions.find((submission) => String(submission.label).toUpperCase() === normalized);
  if (savedMatch) return savedMatch;

  const queueMatch = queue.find((ticket) => String(ticket.label).toUpperCase() === normalized);
  if (queueMatch) return queueMatch;

  for (const desk of desks) {
    const ticket = desk.current;
    if (ticket && String(ticket.label).toUpperCase() === normalized) return ticket;
  }

  return null;
}

function getTicketDeskQueueInfo(ticket, { desks, sortedQueue }) {
  if (!ticket) return { position: null, deskName: "" };

  const normalized = String(ticket.label).toUpperCase();
  const explicitDesk = ticket.deskId == null ? null : desks.find((desk) => String(desk.id) === String(ticket.deskId));
  const eligibleDesks = explicitDesk ? [explicitDesk] : desks.filter((desk) => eligibleForDesk(desk)(ticket));

  const deskMatches = eligibleDesks.map((desk, deskIndex) => {
    const current = desk.current || null;
    const currentMatches = current && String(current.label).toUpperCase() === normalized;
    if (currentMatches) {
      return {
        desk,
        deskIndex,
        position: current.startedAt ? 0 : 1,
      };
    }

    const waitingStartOffset = current && !current.startedAt ? 1 : 0;
    const deskQueueIndex = orderTicketsForDesk(sortedQueue, desk)
      .findIndex((queuedTicket) => String(queuedTicket.label).toUpperCase() === normalized);

    return {
      desk,
      deskIndex,
      position: deskQueueIndex >= 0 ? waitingStartOffset + deskQueueIndex + 1 : null,
    };
  });

  const bestMatch = deskMatches
    .filter((match) => Number.isFinite(match.position))
    .sort((a, b) => a.position - b.position || a.deskIndex - b.deskIndex)[0];
  const fallbackDesk = explicitDesk || (eligibleDesks.length === 1 ? eligibleDesks[0] : null);

  return {
    position: bestMatch?.position ?? null,
    deskName: bestMatch?.desk.name || fallbackDesk?.name || "",
  };
}

export default function App() {
  const initBase = useState(() => Date.now())[0];
  const now = useClock();
  const currentYear = new Date(now).getFullYear();
  const [pathname, setPathname] = useState(() => window.location.pathname || "/");
  const [activeDeskPageId, setActiveDeskPageId] = useState(null);
  const [recentIssuedTicket, setRecentIssuedTicket] = useState(null);
  const [issuedToday, setIssuedToday] = useState(0);
  const [savedSubmissions, setSavedSubmissions] = useState([]);
  const [submissionSummary, setSubmissionSummary] = useState({ total: 0, waiting: 0, serving: 0, served: 0, absent: 0 });
  const [liveQueuePoints, setLiveQueuePoints] = useState([]);
  const [submissionsLoaded, setSubmissionsLoaded] = useState(false);
  const activeSubmissionsRef = useRef([]);

  // --- Core domain state ---------------------------------------------------------------------
  const { queue, setQueue, nextForDesk, nextTwoForDesk, sortedQueue } = useQueue(seedQueue(initBase));
  const { services, setServices, addService: addServiceRaw, renameService, updateService, removeService: removeServiceRaw, serviceName } = useServices(DEFAULT_SERVICES);
  const servicesRef = useRef(services);
  const ticketLogs = useTicketLogs(seedServedLog(initBase), seedAbsentList(initBase), seedRemovedLog(initBase));
  const applySubmissionSnapshot = (submissions) => {
    hydrateSubmissionSnapshot(submissions, {
      services: servicesRef.current,
      setSavedSubmissions,
      setSubmissionSummary,
      setIssuedToday,
      ticketLogs,
      activeSubmissionsRef,
      setDesks,
      setQueue,
    });
  };

  useEffect(() => {
    servicesRef.current = services;
  }, [services]);
  const syncSubmissionsFromServer = () =>
    listSubmissions()
      .then(applySubmissionSnapshot)
      .catch((error) => {
        console.warn(error.message);
      });
  const updateTicketStatus = (ticketId, status, options = {}) => {
    updateSubmissionStatus(ticketId, status, options)
      .then((updatedSubmission) => {
        if (!updatedSubmission) return;

        const previousStatus = activeSubmissionsRef.current.find((submission) => submission.id === updatedSubmission.id)?.status;
        activeSubmissionsRef.current = activeSubmissionsRef.current
          .filter((submission) => submission.id !== updatedSubmission.id)
          .concat(updatedSubmission)
          .filter((submission) => submission.status === "called" || submission.status === "serving");

        if (previousStatus && previousStatus !== updatedSubmission.status) {
          setSubmissionSummary((summary) => moveSummaryStatus(summary, previousStatus, updatedSubmission.status));
        }

        return syncSubmissionsFromServer();
      })
      .catch((error) => {
        console.warn(error.message);
      });
  };

  const deskHooks = useDesks(seedDesks(initBase), {
    queue,
    setQueue,
    onTicketCompleted: ticketLogs.addServedEntry,
    onTicketSkipped: ticketLogs.addAbsentEntry,
    onTicketStatusChange: updateTicketStatus,
  });
  const { desks, setDesks, removeDesk: removeDeskRaw, clearDeskTickets } = deskHooks;

  const memberHooks = useMembers(seedMembers());
  const { unassignDeskFromAllMembers, removeServiceFromAllMembers } = memberHooks;

  const labels = useLabels();
  const { askConfirm, confirmAction, closeConfirm, runConfirm } = useConfirmDialog();

  const ticketIssuer = useTicketIssuer({
    services,
    queue,
    desks,
    setQueue,
    serviceWordLower: labels.serviceWordLower,
    onIssued: (ticket) => {
      setRecentIssuedTicket(ticket);
      navigate(getTicketPath(ticket.label));
    },
  });
  const removeAbsentWithStatus = (ticketId) => {
    const ticket = ticketLogs.removeAbsent(ticketId);
    if (ticket) updateTicketStatus(ticket.id, "removed", { deskId: ticket.skippedFromDesk || null });
    return ticket;
  };
  const ticketLogsWithStatus = {
    ...ticketLogs,
    removeAbsent: removeAbsentWithStatus,
  };
  const { returnToQueue } = useAbsentActions({
    absentList: ticketLogs.absentList,
    setQueue,
    removeAbsentSilently: ticketLogs.removeAbsentSilently,
    onTicketReturned: (ticketId) => updateTicketStatus(ticketId, "queued", { deskId: null }),
  });

  useEffect(() => {
    let cancelled = false;

    listSubmissions()
      .then((submissions) => {
        if (cancelled) return;
        applySubmissionSnapshot(submissions);
      })
      .catch((error) => {
        console.warn(error.message);
      })
      .finally(() => {
        if (!cancelled) setSubmissionsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = createRealtimeClient();
    let cancelled = false;

    const appendLiveQueuePoint = (payload = {}) => {
      if (cancelled) return;

      const waiting = Math.max(0, Number(payload.waiting || 0));
      const serving = Math.max(0, Number(payload.serving || 0));
      const timeValue = Number(payload.time ?? payload.timestamp);
      const time = Number.isFinite(timeValue) ? timeValue : Date.now();

      setSubmissionSummary((summary) => ({
        ...summary,
        waiting,
        serving,
      }));
      setLiveQueuePoints((points) => [...points, { ...payload, time, waiting, serving }].slice(-500));
    };

    const hydrateLiveQueueHistory = (payload = {}) => {
      if (cancelled) return;

      const events = Array.isArray(payload.events) ? payload.events : [];
      setLiveQueuePoints(
        events
          .map((event) => {
            const time = Number(event.time ?? event.timestamp);
            return {
              ...event,
              time,
              waiting: Math.max(0, Number(event.waiting || 0)),
              serving: Math.max(0, Number(event.serving || 0)),
            };
          })
          .filter((event) => Number.isFinite(event.time))
      );
    };

    const updateCurrentLiveCounts = (payload = {}) => {
      if (cancelled) return;

      setSubmissionSummary((summary) => ({
        ...summary,
        waiting: Math.max(0, Number(payload.waiting || 0)),
        serving: Math.max(0, Number(payload.serving || 0)),
      }));
    };

    const syncSubmissions = () => {
      listSubmissions()
        .then((submissions) => {
          if (cancelled) return;
          applySubmissionSnapshot(submissions);
        })
        .catch((error) => {
          if (!cancelled) console.warn(error.message);
        });
    };

    socket.on("connect", syncSubmissions);
    socket.on("submissions:changed", syncSubmissions);
    socket.on("queue:history", hydrateLiveQueueHistory);
    socket.on("queue:current", updateCurrentLiveCounts);
    socket.on("queue:counts", appendLiveQueuePoint);

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    listQueueCountEvents()
      .then((events) => {
        if (cancelled) return;

        setLiveQueuePoints(
          events
            .map((event) => ({
              ...event,
              time: Number(event.time ?? event.timestamp),
              waiting: Math.max(0, Number(event.waiting || 0)),
              serving: Math.max(0, Number(event.serving || 0)),
            }))
            .filter((event) => Number.isFinite(event.time))
        );
      })
      .catch((error) => {
        if (!cancelled) console.warn(error.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    ticketIssuer.syncCountersFromTickets(queue);
  }, [queue]);

  // --- UI-only state ---------------------------------------------------------------------------
  const [manageTab, setManageTab] = useState("desks");
  const [editingDesk, setEditingDesk] = useState(null);
  const [editingService, setEditingService] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [editingDeskLabel, setEditingDeskLabel] = useState(false);
  const [editingServiceLabel, setEditingServiceLabel] = useState(false);
  const [editingMemberLabel, setEditingMemberLabel] = useState(false);
  const [showAddDesk, setShowAddDesk] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newDeskName, setNewDeskName] = useState("");
  const [newDeskServiceIds, setNewDeskServiceIds] = useState([]);
  const [newDeskServiceError, setNewDeskServiceError] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDeskIds, setNewServiceDeskIds] = useState([]);
  const [newServiceDeskError, setNewServiceDeskError] = useState("");
  const [expandedDeskControl, setExpandedDeskControl] = useState(null);
  const [deskDetailTab, setDeskDetailTab] = useState("waiting");
  const [appearanceSettings, setAppearanceSettings] = useState(loadStoredAppearance);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsSaveReady, setSettingsSaveReady] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaveError, setSettingsSaveError] = useState("");
  const [lastSavedSettingsSignature, setLastSavedSettingsSignature] = useState("");
  const settingsPayload = useMemo(
    () => createSettingsPayload({ services, desks, members: memberHooks.members, appearance: appearanceSettings }),
    [services, desks, memberHooks.members, appearanceSettings]
  );
  const settingsPayloadSignature = JSON.stringify(settingsPayload);
  const settingsDirty = settingsLoaded && settingsSaveReady && settingsPayloadSignature !== lastSavedSettingsSignature;

  useEffect(() => {
    storeAppearance(appearanceSettings);
  }, [appearanceSettings]);

  useEffect(() => {
    if (!settingsLoaded || !settingsSaveReady || !settingsDirty) return;
    cacheSettings(JSON.parse(settingsPayloadSignature), { dirty: true });
  }, [settingsDirty, settingsLoaded, settingsSaveReady, settingsPayloadSignature]);

  useEffect(() => {
    let cancelled = false;

    loadSettings()
      .then((settings) => {
        if (cancelled) return;
        const normalizedServices = normalizeServicesForSettings(settings.services);
        const normalizedDesks = reconcileDeskServiceAssignments(settings.desks, normalizedServices);
        const savedAppearance = settings.appearance && typeof settings.appearance === "object" ? settings.appearance : null;
        const normalizedAppearance = normalizeAppearance(savedAppearance || loadStoredAppearance());
        const savedMembers = Array.isArray(settings.members) ? settings.members : Array.isArray(settings.staff) ? settings.staff : [];
        const normalizedMembers = normalizeMembersForSettings(savedMembers, normalizedDesks, normalizedServices);
        const assignmentDesks = deriveDeskServicesFromMembers(normalizedDesks, normalizedMembers, normalizedServices, { preserveWithoutMembers: normalizedMembers.length === 0 });
        const initialSettingsPayloadSignature = JSON.stringify(
          createSettingsPayload({
            services: normalizedServices,
            desks: assignmentDesks,
            members: normalizedMembers,
            appearance: normalizedAppearance,
          })
        );
        setServices(normalizedServices);
        setDesks(assignActiveTicketsToDesks(assignmentDesks, activeSubmissionsRef.current));
        memberHooks.setMembers(normalizedMembers);
        setAppearanceSettings(normalizedAppearance);
        setLastSavedSettingsSignature(initialSettingsPayloadSignature);
        setSettingsSaveReady(true);
      })
      .catch((error) => {
        console.warn(error.message);
      })
      .finally(() => {
        if (!cancelled) setSettingsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;

    setDesks((currentDesks) => {
      const reconciledDesks = reconcileDeskServiceAssignments(currentDesks, services, { preserveCurrent: true });
      const assignedDesks = deriveDeskServicesFromMembers(reconciledDesks, memberHooks.members, services, { preserveWithoutMembers: memberHooks.members.length === 0 });
      return JSON.stringify(currentDesks) === JSON.stringify(assignedDesks) ? currentDesks : assignedDesks;
    });
  }, [memberHooks.members, services, settingsLoaded]);

  useEffect(() => {
    if (!settingsDirty && settingsSaveError) {
      setSettingsSaveError("");
    }
  }, [settingsDirty, settingsSaveError]);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname || "/");

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPath) => {
    if (nextPath === pathname) return;
    window.history.pushState({}, "", nextPath);
    setPathname(nextPath);
  };

  const saveCurrentSettings = async () => {
    if (!settingsLoaded || !settingsSaveReady || settingsSaving || !settingsDirty) return false;

    setSettingsSaving(true);
    setSettingsSaveError("");

    try {
      await saveSettings(JSON.parse(settingsPayloadSignature));
      setLastSavedSettingsSignature(settingsPayloadSignature);
      return true;
    } catch (error) {
      setSettingsSaveError(error.message || "Failed to save settings.");
      return false;
    } finally {
      setSettingsSaving(false);
    }
  };

  const matchedDeskFromPath = findDeskByPath(pathname, desks);
  const ticketLabelFromPath = findTicketLabelByPath(pathname);

  useEffect(() => {
    if (matchedDeskFromPath) {
      setActiveDeskPageId(matchedDeskFromPath.id);
      return;
    }

    if (
      pathname === "/" ||
      pathname === "/analytics" ||
      pathname === "/create" ||
      pathname === "/live" ||
      pathname === "/counters" ||
      pathname === "/services" ||
      pathname === "/members" ||
      pathname === "/settings" ||
      ticketLabelFromPath
    ) {
      setActiveDeskPageId(null);
    }
  }, [matchedDeskFromPath, pathname, ticketLabelFromPath]);

  const activeDesk = matchedDeskFromPath || (activeDeskPageId ? desks.find((desk) => desk.id === activeDeskPageId) || null : null);

  useEffect(() => {
    if (!activeDesk) return;
    if (
      pathname === "/create" ||
      pathname === "/analytics" ||
      pathname === "/live" ||
      pathname === "/counters" ||
      pathname === "/services" ||
      pathname === "/members" ||
      pathname === "/settings" ||
      ticketLabelFromPath
    ) return;

    const nextPath = getDeskPath(activeDesk, desks);
    if (pathname !== nextPath) {
      window.history.replaceState({}, "", nextPath);
      setPathname(nextPath);
    }
  }, [activeDesk, desks, pathname, ticketLabelFromPath]);

  const currentPage = ticketLabelFromPath
    ? "ticket"
    : pathname === "/create"
      ? "create"
      : pathname === "/analytics"
        ? "analytics"
      : pathname === "/live"
        ? "live"
        : pathname === "/counters"
          ? "counters"
        : pathname === "/services"
          ? "services"
        : pathname === "/members"
          ? "members"
        : pathname === "/settings"
          ? "settings"
    : activeDesk
      ? "desk"
      : "dashboard";

  useEffect(() => {
    if (!["counters", "members", "services"].includes(currentPage) || !settingsDirty || settingsSaving) return undefined;

    const saveTimer = window.setTimeout(() => {
      saveCurrentSettings();
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [currentPage, settingsDirty, settingsSaving, settingsPayloadSignature]);

  const getDeskRoute = (desk) => getDeskPath(desk, desks);
  const ticketFromState = ticketLabelFromPath
    ? findSubmissionByLabel(ticketLabelFromPath, {
        savedSubmissions,
        queue,
        desks,
      })
    : null;
  const displayedTicket = recentIssuedTicket && String(recentIssuedTicket.label).toUpperCase() === String(ticketLabelFromPath).toUpperCase() ? recentIssuedTicket : ticketFromState;
  const ticketDeskQueueInfo = getTicketDeskQueueInfo(displayedTicket, { desks, sortedQueue });

  // --- Cross-cutting actions that touch more than one hook's state -----------------------------
  const addDesk = () => {
    deskHooks.addDesk(newDeskName.trim(), labels.deskWord, newDeskServiceIds);
    setNewDeskName("");
    setNewDeskServiceIds([]);
    setNewDeskServiceError("");
    return true;
  };

  const addDeskWithAssignments = (name, memberIds = [], details = {}) => {
    const assignedMemberIds = Array.isArray(memberIds) ? memberIds : [];
    const deskId = deskHooks.addDesk(String(name || "").trim(), labels.deskWord, [], details);
    if (assignedMemberIds.length > 0) {
      memberHooks.setDeskMembers(deskId, assignedMemberIds);
    }
    return { ok: true, deskId };
  };

  const removeDesk = (deskId) => {
    removeDeskRaw(deskId, { onBeforeRemove: unassignDeskFromAllMembers });
  };

  const addService = () => {
    if (!newServiceName.trim()) return false;

    const serviceId = addServiceRaw(newServiceName);
    if (serviceId) {
      const assignedDeskIds = new Set(newServiceDeskIds.map(String));
      setDesks((currentDesks) =>
        currentDesks.map((desk) =>
          assignedDeskIds.has(String(desk.id))
            ? { ...desk, services: Array.from(new Set([...(desk.services || []), serviceId])) }
            : desk
        )
      );
      setNewServiceDeskIds([]);
      setNewServiceDeskError("");
    }
    setNewServiceName("");
    return Boolean(serviceId);
  };

  const addServiceWithAssignments = (name, memberIds = [], details = {}) => {
    const serviceName = String(name || "").trim();
    if (!serviceName) return { ok: false, error: "missing-name" };
    const selectedMemberIds = Array.isArray(memberIds) ? memberIds : [];

    const serviceId = addServiceRaw(serviceName, details);
    if (!serviceId) return { ok: false, error: "missing-name" };

    if (selectedMemberIds.length > 0) {
      memberHooks.setServiceMembers(serviceId, selectedMemberIds);
    }

    return { ok: true, serviceId };
  };

  const removeService = (serviceId) => {
    removeServiceRaw(serviceId);
    removeServiceFromAllMembers(serviceId);
  };

  const toggleDeskService = (deskId, serviceId) => {
    deskHooks.toggleDeskService(deskId, serviceId);
  };

  const toggleNewDeskService = (serviceId) => {
    setNewDeskServiceError("");
    setNewDeskServiceIds((serviceIds) =>
      serviceIds.includes(serviceId)
        ? serviceIds.filter((id) => id !== serviceId)
        : [...serviceIds, serviceId]
    );
  };

  const toggleNewServiceDesk = (deskId) => {
    setNewServiceDeskError("");
    setNewServiceDeskIds((deskIds) =>
      deskIds.map(String).includes(String(deskId))
        ? deskIds.filter((id) => String(id) !== String(deskId))
        : [...deskIds, deskId]
    );
  };

  const clearData = () => {
    setQueue([]);
    setLiveQueuePoints([]);
    setRecentIssuedTicket(null);
    clearDeskTickets();
    ticketLogs.clearLogs();
    ticketIssuer.resetCounters();
    ticketIssuer.resetForm();
    ticketIssuer.setToast(null);
    clearSubmissions()
      .then(() => {
        setIssuedToday(0);
        setSubmissionSummary({ total: 0, waiting: 0, serving: 0, served: 0, absent: 0 });
      })
      .catch((error) => console.warn(error.message));
  };

  // --- Derived stats that cross hook boundaries -------------------------------------------------
  const localCalledNotStarted = desks.filter((d) => d.current && !d.current.startedAt).length;
  const localWaitingNow = queue.length + localCalledNotStarted;
  const localServingNow = desks.filter((d) => d.current && d.current.startedAt).length;
  const waitingNow = Math.max(localWaitingNow, submissionSummary.waiting);
  const servingNow = Math.max(localServingNow, submissionSummary.serving);
  const servedToday = Math.max(ticketLogs.servedLog.length, submissionSummary.served);
  const servedDeskCount = Object.values(ticketLogs.servedByDesk).filter((count) => count > 0).length;
  const absentNow = Math.max(ticketLogs.absentList.length + ticketLogs.removedLog.length, submissionSummary.absent);
  const waitingByService = {};
  queue.forEach((t) => {
    waitingByService[t.serviceId] = (waitingByService[t.serviceId] || 0) + 1;
  });
  desks.forEach((desk) => {
    if (desk.current && !desk.current.startedAt) {
      waitingByService[desk.current.serviceId] = (waitingByService[desk.current.serviceId] || 0) + 1;
    }
  });
  const waitingByDesk = {};
  const waitingByDeskService = {};
  desks.forEach((desk) => {
    const eligibleQueue = queue.filter(eligibleForDesk(desk));
    const calledTicket = desk.current && !desk.current.startedAt ? desk.current : null;
    waitingByDesk[desk.id] = eligibleQueue.length + (calledTicket ? 1 : 0);
    eligibleQueue.forEach((ticket) => {
      const key = `${desk.id}|${ticket.serviceId}`;
      waitingByDeskService[key] = (waitingByDeskService[key] || 0) + 1;
    });
    if (calledTicket) {
      const key = `${desk.id}|${calledTicket.serviceId}`;
      waitingByDeskService[key] = (waitingByDeskService[key] || 0) + 1;
    }
  });
  const adminDeskActions = {
    editingDesk,
    setEditingDesk,
    editingDeskLabel,
    setEditingDeskLabel,
    showAddDesk,
    setShowAddDesk,
    newDeskName,
    setNewDeskName,
    newDeskServiceIds,
    setNewDeskServiceIds,
    newDeskServiceError,
    setNewDeskServiceError,
    toggleNewDeskService,
    addDesk,
    addDeskWithAssignments,
    removeDesk,
    renameDesk: deskHooks.renameDesk,
    updateDesk: deskHooks.updateDesk,
    setDeskServices: deskHooks.setDeskServices,
    toggleDeskService,
    setServiceDesks: deskHooks.setServiceDesks,
    setDeskMembers: memberHooks.setDeskMembers,
  };
  const adminServiceActions = {
    editingService,
    setEditingService,
    editingServiceLabel,
    setEditingServiceLabel,
    showAddService,
    setShowAddService,
    newServiceName,
    setNewServiceName,
    newServiceDeskIds,
    setNewServiceDeskIds,
    newServiceDeskError,
    setNewServiceDeskError,
    toggleNewServiceDesk,
    addService,
    addServiceWithAssignments,
    removeService,
    renameService,
    updateService,
    setServiceMembers: memberHooks.setServiceMembers,
  };
  const adminMemberActions = {
    editingMember,
    setEditingMember,
    editingMemberLabel,
    setEditingMemberLabel,
    showAddMember,
    setShowAddMember,
    addMember: memberHooks.addMember,
    updateMember: memberHooks.updateMember,
    removeMember: memberHooks.removeMember,
    toggleMemberDesk: memberHooks.toggleMemberDesk,
    setMemberDesks: memberHooks.setMemberDesks,
    toggleMemberService: memberHooks.toggleMemberService,
    setMemberServices: memberHooks.setMemberServices,
    setServiceMembers: memberHooks.setServiceMembers,
    setDeskMembers: memberHooks.setDeskMembers,
  };
  const adminManageUi = {
    desks: {
      editingDesk,
      setEditingDesk,
      editingDeskLabel,
      setEditingDeskLabel,
      showAddDesk,
      setShowAddDesk,
      newDeskName,
      setNewDeskName,
      newDeskServiceIds,
      setNewDeskServiceIds,
      newDeskServiceError,
      setNewDeskServiceError,
      toggleNewDeskService,
    },
    services: {
      editingService,
      setEditingService,
      editingServiceLabel,
      setEditingServiceLabel,
      showAddService,
      setShowAddService,
      newServiceName,
      setNewServiceName,
      newServiceDeskIds,
      setNewServiceDeskIds,
      newServiceDeskError,
      setNewServiceDeskError,
      toggleNewServiceDesk,
    },
    members: { editingMember, setEditingMember, editingMemberLabel, setEditingMemberLabel, showAddMember, setShowAddMember },
  };
  return (
    <div className="flex min-h-screen w-full flex-col" style={{ background: C.ink900, color: C.textLight, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {currentPage === "create" ? (
        <CreatePage ticketIssuer={ticketIssuer} desks={desks} services={services} labels={labels} />
      ) : currentPage === "ticket" ? (
        <TicketPage
          ticketLabel={ticketLabelFromPath}
          ticket={displayedTicket}
          ticketsLoaded={submissionsLoaded}
          ticketPosition={ticketDeskQueueInfo.position}
          ticketDeskName={ticketDeskQueueInfo.deskName}
          serviceName={serviceName}
          onNavigate={navigate}
        />
      ) : (
        <AdminShell
          currentPage={currentPage}
          onNavigate={navigate}
          appearance={appearanceSettings}
          onAppearanceChange={setAppearanceSettings}
        >
          {(adminTheme) => (
          <div className="flex min-h-0 flex-1 flex-col">

      {currentPage === "dashboard" && (
        <>
          <StatsStrip
            joinedToday={issuedToday}
            totalServed={servedToday}
            servedDeskCount={servedDeskCount}
            servedDeskLabel={`Served ${labels.deskWordPlural}`}
            waitingNow={waitingNow}
            theme={adminTheme}
          />
        </>
      )}

      {currentPage === "create" ? (
        <CreatePage ticketIssuer={ticketIssuer} desks={desks} services={services} labels={labels} />
      ) : currentPage === "ticket" ? (
        <TicketPage
          ticketLabel={ticketLabelFromPath}
          ticket={displayedTicket}
          ticketsLoaded={submissionsLoaded}
          ticketPosition={ticketDeskQueueInfo.position}
          ticketDeskName={ticketDeskQueueInfo.deskName}
          serviceName={serviceName}
          onNavigate={navigate}
        />
      ) : currentPage === "live" ? (
        <LivePage
          desks={desks}
          now={now}
          nextForDesk={nextForDesk}
          nextTwoForDesk={nextTwoForDesk}
        />
      ) : currentPage === "analytics" ? (
        <AdminAnalyticsPage
          waitingNow={waitingNow}
          servingNow={servingNow}
          servedToday={servedToday}
          absentNow={absentNow}
          submissions={savedSubmissions}
          liveQueuePoints={liveQueuePoints}
          now={now}
          theme={adminTheme}
        />
      ) : currentPage === "counters" ? (
        <AdminCountersPage
          desks={desks}
          services={services}
          members={memberHooks.members}
          labels={labels}
          askConfirm={askConfirm}
          getDeskPath={getDeskRoute}
          deskActions={adminDeskActions}
          manageUi={adminManageUi}
          theme={adminTheme}
          settingsSaving={settingsSaving}
          settingsSaveError={settingsSaveError}
        />
      ) : currentPage === "services" ? (
        <AdminServicesPage
          services={services}
          desks={desks}
          members={memberHooks.members}
          labels={labels}
          askConfirm={askConfirm}
          serviceActions={adminServiceActions}
          memberActions={adminMemberActions}
          manageUi={adminManageUi}
          theme={adminTheme}
          settingsSaving={settingsSaving}
          settingsSaveError={settingsSaveError}
        />
      ) : currentPage === "members" ? (
        <AdminMembersPage
          desks={desks}
          services={services}
          members={memberHooks.members}
          brandName={adminTheme.systemName}
          labels={labels}
          askConfirm={askConfirm}
          memberActions={adminMemberActions}
          manageUi={adminManageUi}
          theme={adminTheme}
          settingsSaving={settingsSaving}
          settingsSaveError={settingsSaveError}
        />
      ) : currentPage === "settings" ? (
        <AdminSettingsPage
          theme={adminTheme}
          defaultAppearance={DEFAULT_APPEARANCE_SETTINGS}
          onSaveSettings={saveCurrentSettings}
        />
      ) : currentPage === "desk" && activeDesk ? (
        <DeskPage
          desk={activeDesk}
          deskPath={getDeskRoute(activeDesk)}
          desks={desks}
          services={services}
          serviceName={serviceName}
          labels={labels}
          now={now}
          queue={queue}
          sortedQueue={sortedQueue}
          eligibleForDesk={eligibleForDesk}
          expandedDeskControl={expandedDeskControl}
          setExpandedDeskControl={setExpandedDeskControl}
          deskDetailTab={deskDetailTab}
          setDeskDetailTab={setDeskDetailTab}
          deskActions={deskHooks}
          ticketLogs={ticketLogsWithStatus}
          returnToQueue={returnToQueue}
          askConfirm={askConfirm}
          onNavigate={navigate}
        />
      ) : (
        <>
          <main className="flex-1 min-h-0 w-full px-2.5 pb-2.5 sm:px-6 sm:pb-6 md:pl-10 md:pr-6">
            <section
              className="overflow-visible border bg-white/5 p-4"
              style={{
                minHeight: `${DASHBOARD_BREAKDOWN_MIN_HEIGHT}px`,
                borderColor: adminTheme.borderColor,
                borderRadius: adminTheme.radius * 1.4,
              }}
            >
              <div className="min-w-0">
                <BreakdownTabsSection
                  embedded
                  theme={adminTheme}
                  services={services}
                  desks={desks}
                  members={memberHooks.members}
                  labels={labels}
                  servedByService={ticketLogs.servedByService}
                  absentByService={ticketLogs.absentByService}
                  removedByService={ticketLogs.removedByService}
                  waitingByService={waitingByService}
                  servedByDeskService={ticketLogs.servedByDeskService}
                  absentByDeskService={ticketLogs.absentByDeskService}
                  servedByDesk={ticketLogs.servedByDesk}
                  absentByDesk={ticketLogs.absentByDesk}
                  removedByDesk={ticketLogs.removedByDesk}
                  waitingByDesk={waitingByDesk}
                  waitingByDeskService={waitingByDeskService}
                  removedByDeskService={ticketLogs.removedByDeskService}
                  sortedQueue={sortedQueue}
                  sortedServed={ticketLogs.sortedServed}
                  absentList={ticketLogs.absentList}
                  removedLog={ticketLogs.removedLog}
                  serviceName={serviceName}
                  now={now}
                  getDeskPath={getDeskRoute}
                  onNavigate={navigate}
                />
              </div>
            </section>
          </main>

        </>
      )}

      <div className="mt-auto">
        <div className="qp-container py-3">
          <div className="text-center text-[11px] leading-tight" style={{ color: C.textFaint }}>
            <a
              href="https://waitqr.com"
              title="waitqr.com"
              className="qp-focusable underline-offset-2 hover:underline"
              style={{ color: C.textFaint }}
            >
              WaitQR
            </a>{" "}
            © {currentYear} All rights reserved.
          </div>
        </div>
      </div>
      </div>
          )}
        </AdminShell>
      )}

      <IssueToast toast={ticketIssuer.toast} serviceName={serviceName} />
      <ConfirmDialog confirmAction={confirmAction} onCancel={closeConfirm} onConfirm={runConfirm} />
    </div>
  );
}
