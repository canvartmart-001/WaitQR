# WaitQR

A queue management dashboard: a public-facing "Live Board" display, a member-facing desk console
for calling/serving tickets, and a settings panel for managing desks, services, and members.

The UI still keeps most queue state in React today, but kiosk submissions can now be saved through
a Node.js + PostgreSQL backend. New tickets are issued by the API, persisted to Postgres, then
added back into the frontend queue so the current UI keeps working.

## Running it

```bash
npm install
npm start
```

To run the backend as well:

```bash
npm run db:up
npm run server
npm start
```

`DATABASE_URL` must point to a PostgreSQL database the app can connect to. The included Docker
Compose setup starts a local Postgres database that matches `.env.example`.

## Codespaces startup and live preview

Use these steps when you open the project in a new Codespace or when an existing Codespace starts
again.

### First time in a new Codespace

1. Install Node dependencies:

   ```bash
   npm install
   ```

2. Make sure `.env` exists and points to the local database:

   ```bash
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/waitqr
   ```

3. Start PostgreSQL. If Docker is available, use the normal project command:

   ```bash
   npm run db:up
   ```

   If Docker is not available but PostgreSQL is installed in the Codespace, create a local database
   once:

   ```bash
   /usr/lib/postgresql/17/bin/initdb -D .pgdata --username=postgres --auth=trust
   /usr/lib/postgresql/17/bin/pg_ctl -D .pgdata -l .pgdata/server.log -o "-k .pgdata" start
   createdb -h localhost -U postgres waitqr
   ```

4. Start the backend API in one terminal:

   ```bash
   npm run server
   ```

5. Start the frontend in another terminal:

   ```bash
   npm start
   ```

6. Open the live preview:

   - Frontend: `http://localhost:3000/`
   - Backend health check: `http://localhost:4000/api/health`

In GitHub Codespaces, open the **Ports** tab and use the forwarded URL for port `3000` to preview
the app in your browser. Keep port `4000` running for backend API calls.

### When the same Codespace starts again

1. Start PostgreSQL again if it is not already running:

   ```bash
   npm run db:up
   ```

   Or, if you used the local `.pgdata` setup:

   ```bash
   /usr/lib/postgresql/17/bin/pg_ctl -D .pgdata -l .pgdata/server.log -o "-k .pgdata" start
   ```

2. Start the backend:

   ```bash
   npm run server
   ```

3. Start the frontend:

   ```bash
   npm start
   ```

4. Open the forwarded port `3000` preview again from the Codespaces **Ports** tab.

If port `3000`, `4000`, or `5432` is already in use, stop the old terminal process or close the old
Codespace task before starting it again.

## Project structure

```text
src/
  App.jsx
  index.jsx
  hooks/
  components/
  lib/
  styles/
server/
  index.js
  db.js
  store.js
  sql/schema.sql
```
