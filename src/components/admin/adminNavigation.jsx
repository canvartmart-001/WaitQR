import {
  BarChart3,
  Bell,
  FileText,
  LayoutDashboard,
  Layers3,
  ListOrdered,
  Monitor,
  Settings,
  Ticket,
  Users,
  Webhook,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/", page: "dashboard" },
  { label: "Analytics", icon: BarChart3, path: "/analytics", page: "analytics" },
  { label: "Tickets", icon: Ticket, path: null },
  { label: "Counters", icon: ListOrdered, path: "/counters", page: "counters" },
  { label: "Services", icon: Layers3, path: "/services", page: "services" },
  { label: "Members", icon: Users, path: "/members", page: "members" },
  { label: "Reports", icon: FileText, path: null },
  { label: "Integrations", icon: Webhook, path: null },
  { label: "Notifications", icon: Bell, path: null },
  { label: "Settings", icon: Settings, path: "/settings", page: "settings" },
];

export const ADMIN_PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: "Monitor queue activity and operations.", icon: LayoutDashboard },
  analytics: { title: "Analytics", subtitle: "Analyze ticket status, queue movement, and live demand trends.", icon: BarChart3 },
  counters: { title: "Counters", subtitle: "Manage counters and their assigned services.", icon: ListOrdered },
  desk: { title: "Counter Console", subtitle: "Call, serve, skip, and complete tickets.", icon: ListOrdered },
  live: { title: "Live Board", subtitle: "Public queue display view.", icon: Monitor },
  services: { title: "Services", subtitle: "Create service lines and assign them to counters.", icon: Layers3 },
  members: { title: "Members", subtitle: "Manage member profiles and counter access.", icon: Users },
  settings: { title: "Settings", subtitle: "Configure global preferences and appearance.", icon: Settings },
};
