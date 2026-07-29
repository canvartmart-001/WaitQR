# Backend Structure

- `index.js` wires Express routes, realtime Socket.IO events, CORS, and server startup.
- `store.js` is the data-access layer for submissions, queue history, and app settings.
- `db.js` owns the PostgreSQL pool.
- `sql/schema.sql` defines database tables and indexes.
- `proxy-server.js` is a local development proxy helper.
- `waitModel.js` learns service duration from completed work and calculates live ticket, service, and counter estimates.

## Wait estimates

`GET /api/wait-estimates` returns the current model metadata and all active estimates. Pass
`submissionId` to return one ticket. Queue changes are also broadcast as
`wait-estimates:changed` Socket.IO events.

The model blends recent member/service, counter/service, service/time-of-day,
service/day-type, service-wide, and global history. New installations begin with
a five-minute fallback and widen the displayed range until enough completed
services raise confidence. Set `WAIT_ESTIMATE_TIME_ZONE` to the location's IANA
time zone, such as `America/New_York`, so time-of-day learning follows local
business hours.

Completed service samples are retained in `service_history` when the live queue
is cleared. This keeps the learned model stable across operational resets.

If the API grows, split `index.js` by route group first, for example `routes/submissions.js`, `routes/settings.js`, and `realtime.js`, while keeping database queries in `store.js`.
