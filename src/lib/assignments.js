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
  if (normalized === "manager") return "Manager";
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
  return (Array.isArray(members) ? members : []).filter((member) => memberHasService(member, serviceId));
}

export function assignedMembersForDesk(members = [], deskId) {
  return (Array.isArray(members) ? members : []).filter((member) => memberHasDesk(member, deskId));
}

export function deriveDeskServicesFromMembers(desks = [], members = [], services = [], { preserveWithoutMembers = true } = {}) {
  const validServiceIds = new Map((Array.isArray(services) ? services : []).map((service) => [String(service.id), service.id]));
  const servicesByDeskId = new Map();
  let hasMemberCoverage = false;

  (Array.isArray(members) ? members : [])
    .filter((member) => member?.status !== "Inactive")
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
