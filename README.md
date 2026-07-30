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

## Codespaces Startup And Preview

Codespaces is configured to start the WaitQR preview automatically.

When you open or restart the Codespace:

1. Wait about 30 seconds for the startup command to run.
2. Open the **Ports** tab in Codespaces.
3. Open the forwarded URL for port `3000`, labeled `WaitQR frontend`.
4. Keep port `4000`, labeled `WaitQR API`, running for backend requests.

The app should be available at:

- Frontend: forwarded Codespaces URL for port `3000`
- Local frontend inside the Codespace: `http://127.0.0.1:3000/`
- Backend health check: `http://127.0.0.1:4000/api/health`

The automatic startup is defined in `.devcontainer/devcontainer.json` and runs:

```bash
bash .devcontainer/start-server.sh
```

That script installs dependencies when needed, starts PostgreSQL with Docker Compose when Docker is
available, starts the backend on port `4000`, and starts Vite on port `3000`.

### If Port 3000 Shows 404

Use this quick recovery checklist:

1. In the Codespaces **Ports** tab, confirm port `3000` exists and is labeled `WaitQR frontend`.
2. Open the port `3000` URL from the **Ports** tab instead of reusing an old browser bookmark.
3. If the page still shows 404, run:

   ```bash
   bash .devcontainer/start-server.sh
   ```

4. Check the local frontend:

   ```bash
   curl -I http://127.0.0.1:3000/
   ```

   A healthy frontend returns `HTTP/1.1 200 OK`.

5. Check the backend:

   ```bash
   curl http://127.0.0.1:4000/api/health
   ```

   A healthy backend returns `{"ok":true}`.

6. If the local checks are healthy but the forwarded URL still shows 404, hard refresh the browser
   tab or reopen port `3000` from the Codespaces **Ports** tab. The GitHub tunnel can keep a stale
   preview route briefly after a Codespace restart.

After changing `.devcontainer/devcontainer.json`, run **Codespaces: Rebuild Container** once so
GitHub applies the startup hooks.

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
