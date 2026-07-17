# Backend Structure

- `index.js` wires Express routes, realtime Socket.IO events, CORS, and server startup.
- `store.js` is the data-access layer for submissions, queue history, and app settings.
- `db.js` owns the PostgreSQL pool.
- `sql/schema.sql` defines database tables and indexes.
- `proxy-server.js` is a local development proxy helper.

If the API grows, split `index.js` by route group first, for example `routes/submissions.js`, `routes/settings.js`, and `realtime.js`, while keeping database queries in `store.js`.
