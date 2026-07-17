const RESERVED_SLUGS = new Set(["create", "live", "settings"]);
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
  if (!pathname || pathname === "/" || pathname === "/create" || pathname === "/live" || pathname === "/settings" || isTicketLabelPath(pathname)) return null;

  const slug = pathname.replace(/^\/+|\/+$/g, "");
  return desks.find((desk) => getDeskSlug(desk, desks) === slug) || null;
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
