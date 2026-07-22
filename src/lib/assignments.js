export function uniqueIds(ids = []) {
  return Array.from(
    new Map(
      (Array.isArray(ids) ? ids : [])
        .filter((id) => id != null && id !== "")
        .map((id) => [String(id), id])
    ).values()
  );
}

export function memberHasService(member, serviceId) {
  return uniqueIds(member?.serviceIds).map(String).includes(String(serviceId));
}

export function memberHasDesk(member, deskId) {
  return uniqueIds(member?.deskIds).map(String).includes(String(deskId));
}

export function normalizeMemberRole(role) {
  const normalized = String(role || "Member").trim().toLowerCase();
  if (normalized === "administrator" || normalized === "manager") return "Administrator";
  if (normalized === "receptionist") return "Receptionist";
  return "Member";
}

export function memberCanBeAssigned(member) {
  return memberCanBeAssignedToService(member);
}

export function memberCanBeAssignedToService(member) {
  return normalizeMemberRole(member?.role) === "Member";
}

export function memberCanBeAssignedToDesk(member) {
  return ["Member", "Receptionist"].includes(normalizeMemberRole(member?.role));
}

export function assignedMembersForService(members = [], serviceId) {
  return (Array.isArray(members) ? members : []).filter(
    (member) => memberCanBeAssignedToService(member) && memberHasService(member, serviceId)
  );
}

export function assignedMembersForDesk(members = [], deskId) {
  return (Array.isArray(members) ? members : []).filter(
    (member) => memberCanBeAssignedToDesk(member) && memberHasDesk(member, deskId)
  );
}

export function eligibleDeskIdsForService(members = [], serviceId, validDeskIds = []) {
  const valid = new Map((Array.isArray(validDeskIds) ? validDeskIds : []).map((id) => [String(id), id]));

  return uniqueIds(
    (Array.isArray(members) ? members : [])
      .filter((member) => member?.status !== "Inactive" && memberCanBeAssignedToService(member))
      .filter((member) => memberHasService(member, serviceId))
      .flatMap((member) => uniqueIds(member?.deskIds))
      .map((deskId) => valid.get(String(deskId)))
      .filter((deskId) => deskId != null)
  );
}

export function selectDeskByLoad(eligibleDeskIds = [], loads = {}, lastDeskId = null) {
  const deskIds = uniqueIds(eligibleDeskIds).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  if (deskIds.length === 0) return null;

  const minimumLoad = Math.min(...deskIds.map((deskId) => Number(loads[String(deskId)] || 0)));
  const leastLoaded = deskIds.filter((deskId) => Number(loads[String(deskId)] || 0) === minimumLoad);
  const lastIndex = leastLoaded.findIndex((deskId) => String(deskId) === String(lastDeskId));
  return leastLoaded[(lastIndex + 1) % leastLoaded.length];
}

export function selectDeskByWorkload(eligibleDeskIds = [], serviceLoads = {}, totalLoads = {}, lastDeskId = null) {
  const deskIds = uniqueIds(eligibleDeskIds).sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  if (deskIds.length === 0) return null;

  const minimumTotalLoad = Math.min(...deskIds.map((deskId) => Number(totalLoads[String(deskId)] || 0)));
  const leastBusy = deskIds.filter((deskId) => Number(totalLoads[String(deskId)] || 0) === minimumTotalLoad);
  const minimumServiceLoad = Math.min(...leastBusy.map((deskId) => Number(serviceLoads[String(deskId)] || 0)));
  const best = leastBusy.filter((deskId) => Number(serviceLoads[String(deskId)] || 0) === minimumServiceLoad);
  const lastIndex = best.findIndex((deskId) => String(deskId) === String(lastDeskId));
  return best[(lastIndex + 1) % best.length];
}

export function deriveDeskServicesFromMembers(desks = [], members = [], services = [], { preserveWithoutMembers = true } = {}) {
  const validServiceIds = new Map((Array.isArray(services) ? services : []).map((service) => [String(service.id), service.id]));
  const servicesByDeskId = new Map();
  let hasMemberCoverage = false;

  (Array.isArray(members) ? members : [])
    .filter((member) => member?.status !== "Inactive" && memberCanBeAssignedToService(member))
    .forEach((member) => {
      const memberServiceIds = uniqueIds(member.serviceIds)
        .map((serviceId) => validServiceIds.get(String(serviceId)))
        .filter(Boolean);
      const memberDeskIds = uniqueIds(member.deskIds);

      if (memberServiceIds.length > 0 && memberDeskIds.length > 0) {
        hasMemberCoverage = true;
      }

      memberDeskIds.forEach((deskId) => {
        const key = String(deskId);
        const existing = servicesByDeskId.get(key) || [];
        servicesByDeskId.set(key, uniqueIds([...existing, ...memberServiceIds]));
      });
    });

  return (Array.isArray(desks) ? desks : []).map((desk) => {
    const derivedServices = servicesByDeskId.get(String(desk.id)) || [];
    const legacyServices = uniqueIds(desk.services).filter((serviceId) => validServiceIds.has(String(serviceId)));
    const nextServices = hasMemberCoverage || !preserveWithoutMembers
      ? derivedServices
      : legacyServices.length > 0
        ? legacyServices
        : [];

    return { ...desk, services: nextServices };
  });
}
