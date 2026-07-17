# Admin Frontend Structure

- `AdminShell.jsx` owns the admin frame: sidebar, top bar, theme controls, and page chrome.
- `adminNavigation.jsx` is the single source of truth for sidebar order, labels, routes, and page titles.
- Each routed admin screen lives in its own folder as `Admin<Page>Name.jsx`, for example `counters/AdminCountersPage.jsx`.
- Shared admin management panels that are reused outside a single routed page live in `src/components/manage`.
- Keep placeholder or future admin sections in `adminNavigation.jsx` until they have a real page component.
