const RESERVED_SLUGS = new Set(["create", "create-password", "live", "login", "reset-password", "settings", "analytics", "counters", "services", "members"]);
const TICKET_LABEL_PATH = /^[AP]\d+$/i;

export function slugifySegment(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return "desk";
  if (RESERVED_SLUGS.has(normalized)) return `desk-${normalized}`;
  return normalized;
}

export function getDeskSlug(desk, desks) {
  const base = slugifySegment(desk?.name || "desk");
  const index = desks.findIndex((item) => item.id === desk.id);
  const duplicateCount = desks.slice(0, index).filter((item) => slugifySegment(item.name) === base).length;

  return duplicateCount === 0 ? base : `${base}-${duplicateCount + 1}`;
}

export function getDeskPath(desk, desks) {
  return `/${getDeskSlug(desk, desks)}`;
}

export function findDeskByPath(pathname, desks) {
  if (!pathname || pathname === "/" || RESERVED_SLUGS.has(pathname.replace(/^\/+|\/+$/g, "").toLowerCase()) || isTicketLabelPath(pathname)) return null;

  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return desks.find((desk) => getDeskSlug(desk, desks) === slug) || null;
}

export function getMemberSlug(member, members) {
  const base = slugifySegment(member?.name || member?.id || "member");
  const memberList = Array.isArray(members) ? members : [];
  const index = memberList.findIndex((item) => String(item.id) === String(member?.id));
  const previousMembers = index >= 0 ? memberList.slice(0, index) : [];
  const duplicateCount = previousMembers.filter((item) => slugifySegment(item.name || item.id || "member") === base).length;

  return duplicateCount === 0 ? base : `${base}-${duplicateCount + 1}`;
}

export function getMemberProfilePath(member, members) {
  return `/members/${encodeURIComponent(getMemberSlug(member, members))}`;
}

export function findMemberByProfilePath(pathname, members) {
  if (!pathname || pathname === "/" || isTicketLabelPath(pathname)) return null;

  const parts = pathname.replace(/^\/+|\/+$/g, "").split("/");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "members") return null;

  const slug = decodeURIComponent(parts[1] || "").toLowerCase();
  if (!slug) return null;

  return (Array.isArray(members) ? members : []).find((member) => getMemberSlug(member, members) === slug) || null;
}

export function getTicketPath(ticketLabel) {
  return `/${encodeURIComponent(ticketLabel)}`;
}

export function isTicketLabelPath(pathname) {
  if (!pathname) return null;

  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return TICKET_LABEL_PATH.test(slug);
}

export function findTicketLabelByPath(pathname) {
  if (!pathname) return null;

  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return TICKET_LABEL_PATH.test(slug) ? slug.toUpperCase() : null;
}
