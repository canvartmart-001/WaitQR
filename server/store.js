import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { pad } from "../src/lib/format.js";
import { eligibleDeskIdsForService, selectDeskByWorkload } from "../src/lib/assignments.js";
import { buildWaitEstimates, predictServiceDuration } from "./waitModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "sql", "schema.sql");
const waitEstimateTimeZone = process.env.WAIT_ESTIMATE_TIME_ZONE || "UTC";

function toTicketLabel(type, value) {
  return `${type === "priority" ? "P" : "A"}${pad(value)}`;
}

function seedCounterFloor(type) {
  return 0;
}

function mapSubmissionRow(row) {
  return {
    id: String(row.id),
    label: row.label,
    type: row.type,
    name: row.name,
    phone: row.phone,
    phoneDigits: row.phone_digits,
    serviceId: row.service_id,
    deskId: row.desk_id,
    status: row.status,
    calledAt: row.called_at ? new Date(row.called_at).getTime() : null,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).getTime() : null,
    servedByMemberId: row.served_by_member_id || "",
    servedByMemberName: row.served_by_member_name || "",
    statusUpdatedAt: new Date(row.status_updated_at || row.created_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function mapWaitModelTicket(row) {
  return {
    id: String(row.id),
    label: row.label,
    type: row.type,
    serviceId: row.service_id,
    deskId: row.desk_id,
    memberId: row.served_by_member_id,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    calledAt: row.called_at ? new Date(row.called_at).getTime() : null,
    startedAt: row.started_at ? new Date(row.started_at).getTime() : null,
  };
}

function mapWaitModelHistory(row) {
  return {
    serviceId: row.service_id,
    deskId: row.desk_id,
    memberId: row.member_id,
    startedAt: new Date(row.started_at).getTime(),
    completedAt: new Date(row.completed_at).getTime(),
    serviceMs: Number(row.service_ms),
  };
}

async function loadWaitModelInputs(queryable = pool) {
  const [historyResult, ticketsResult, queueStateResult, desksResult] = await Promise.all([
    queryable.query(
      `SELECT service_id, desk_id, member_id, started_at, completed_at, service_ms
       FROM service_history
       WHERE completed_at >= NOW() - INTERVAL '365 days'
         AND service_ms BETWEEN 15000 AND 14400000
       ORDER BY completed_at DESC
       LIMIT 10000`,
    ),
    queryable.query(
      `SELECT id, label, type, service_id, desk_id, served_by_member_id, status, created_at, called_at, started_at
       FROM submissions
       WHERE status IN ('queued', 'called', 'serving')
       ORDER BY created_at, id`,
    ),
    queryable.query(
      `SELECT MAX(status_updated_at) AS queue_changed_at
       FROM submissions`,
    ),
    queryable.query(
      `SELECT value
       FROM app_settings
       WHERE settings_key = 'desks'`,
    ),
  ]);
  const desks = Array.isArray(desksResult.rows[0]?.value) ? desksResult.rows[0].value : [];

  return {
    history: historyResult.rows.map(mapWaitModelHistory),
    tickets: ticketsResult.rows.map(mapWaitModelTicket),
    desks: desks.map((desk) => ({
      id: desk.id,
      onBreak: Boolean(desk.onBreak),
      breakStartedAt: desk.breakStartedAt == null ? null : Number(desk.breakStartedAt),
      waitForecastChangedAt: desk.waitForecastChangedAt == null ? null : Number(desk.waitForecastChangedAt),
    })),
    forecastAt: queueStateResult.rows[0]?.queue_changed_at
      ? new Date(queueStateResult.rows[0].queue_changed_at).getTime()
      : Date.now(),
  };
}

async function selectDeskByPredictedWorkload(client, eligibleDeskIds, serviceId, lastDeskId) {
  const now = Date.now();
  const { history, tickets, desks } = await loadWaitModelInputs(client);
  const estimates = buildWaitEstimates({
    history,
    tickets,
    desks,
    now,
    timeZone: waitEstimateTimeZone,
  });
  const countersByDesk = new Map(
    estimates.counters
      .filter((counter) => counter.deskId != null)
      .map((counter) => [String(counter.deskId), counter]),
  );
  const candidates = eligibleDeskIds.map((deskId) => {
    const prediction = predictServiceDuration(
      history,
      { serviceId, deskId, createdAt: now },
      { now, timeZone: waitEstimateTimeZone },
    );
    const queuedWorkMs = countersByDesk.get(String(deskId))?.estimatedClearMs || 0;
    return {
      deskId,
      score: queuedWorkMs + prediction.expectedMs,
    };
  });
  const bestScore = Math.min(...candidates.map((candidate) => candidate.score));
  const tiedDeskIds = candidates
    .filter((candidate) => Math.abs(candidate.score - bestScore) < 1000)
    .map((candidate) => candidate.deskId);

  if (tiedDeskIds.length <= 1) return tiedDeskIds[0];
  return selectDeskByWorkload(
    tiedDeskIds,
    Object.fromEntries(tiedDeskIds.map((deskId) => [String(deskId), 0])),
    Object.fromEntries(tiedDeskIds.map((deskId) => [String(deskId), 0])),
    lastDeskId,
  );
}

function mapQueueCountEventRow(row) {
  return {
    id: String(row.id),
    eventType: row.event_type,
    submissionId: row.submission_id == null ? null : String(row.submission_id),
    waiting: Number(row.waiting || 0),
    serving: Number(row.serving || 0),
    time: new Date(row.event_at).getTime(),
  };
}

export async function ensureSchema() {
  const sql = await fs.readFile(schemaPath, "utf8");
  await pool.query(sql);
  await assignUnassignedQueuedSubmissions();
}

export async function assignUnassignedQueuedSubmissions() {
  const client = await pool.connect();
  let assignedCount = 0;

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["waitqr:assignment-backfill"]);

    const settingsResult = await client.query(
      "SELECT settings_key, value FROM app_settings WHERE settings_key IN ('desks', 'members')",
    );
    const settings = settingsResult.rows.reduce((result, row) => ({ ...result, [row.settings_key]: row.value }), {});
    const desks = Array.isArray(settings.desks) ? settings.desks : [];
    const members = Array.isArray(settings.members) ? settings.members : [];
    const waitingResult = await client.query(
      `SELECT id, service_id
       FROM submissions
       WHERE status = 'queued' AND desk_id IS NULL AND service_id IS NOT NULL
       ORDER BY created_at, id`,
    );

    for (const submission of waitingResult.rows) {
      const eligibleDeskIds = eligibleDeskIdsForService(members, submission.service_id, desks.map((desk) => desk.id));
      if (eligibleDeskIds.length === 0) continue;

      const loadResult = await client.query(
        `SELECT desk_id,
                COUNT(*)::int AS total_load,
                COUNT(*) FILTER (WHERE service_id = $1)::int AS service_load
         FROM submissions
         WHERE desk_id = ANY($2::text[])
           AND status IN ('queued', 'called', 'serving')
         GROUP BY desk_id`,
        [String(submission.service_id), eligibleDeskIds.map(String)],
      );
      const serviceLoads = Object.fromEntries(loadResult.rows.map((row) => [String(row.desk_id), Number(row.service_load)]));
      const totalLoads = Object.fromEntries(loadResult.rows.map((row) => [String(row.desk_id), Number(row.total_load)]));
      const stateResult = await client.query(
        "SELECT last_desk_id FROM service_assignment_state WHERE service_id = $1",
        [String(submission.service_id)],
      );
      const deskId = selectDeskByWorkload(eligibleDeskIds, serviceLoads, totalLoads, stateResult.rows[0]?.last_desk_id);

      await client.query("UPDATE submissions SET desk_id = $2 WHERE id = $1", [submission.id, String(deskId)]);
      assignedCount += 1;
      await client.query(
        `INSERT INTO service_assignment_state (service_id, last_desk_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (service_id) DO UPDATE SET last_desk_id = EXCLUDED.last_desk_id, updated_at = NOW()`,
        [String(submission.service_id), String(deskId)],
      );
    }

    await client.query("COMMIT");
    return assignedCount;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createSubmission({ name, phone, serviceId, type }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    // Serialize routing decisions so simultaneous kiosk submissions cannot choose
    // the same least-loaded counter from an identical snapshot.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`waitqr:${serviceId || "__general__"}`]);

    const settingsResult = await client.query(
      "SELECT settings_key, value FROM app_settings WHERE settings_key IN ('desks', 'members')",
    );
    const settings = settingsResult.rows.reduce((result, row) => ({ ...result, [row.settings_key]: row.value }), {});
    const desks = Array.isArray(settings.desks) ? settings.desks : [];
    const members = Array.isArray(settings.members) ? settings.members : [];
    const eligibleDeskIds = serviceId
      ? eligibleDeskIdsForService(members, serviceId, desks.map((desk) => desk.id))
      : [];

    if (serviceId && eligibleDeskIds.length === 0) {
      const assignmentError = new Error("No active member and counter assignment is available for this service.");
      assignmentError.code = "SERVICE_COUNTER_UNAVAILABLE";
      throw assignmentError;
    }

    let deskId = null;
    if (eligibleDeskIds.length > 0) {
      const stateResult = await client.query(
        "SELECT last_desk_id FROM service_assignment_state WHERE service_id = $1",
        [String(serviceId)],
      );
      deskId = await selectDeskByPredictedWorkload(
        client,
        eligibleDeskIds,
        String(serviceId),
        stateResult.rows[0]?.last_desk_id,
      );
      await client.query(
        `INSERT INTO service_assignment_state (service_id, last_desk_id, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (service_id) DO UPDATE SET last_desk_id = EXCLUDED.last_desk_id, updated_at = NOW()`,
        [String(serviceId), String(deskId)],
      );
    }
    await client.query(
      "INSERT INTO ticket_counters (counter_key, value) VALUES ($1, 0) ON CONFLICT (counter_key) DO NOTHING",
      [type],
    );

    const counterResult = await client.query(
      "UPDATE ticket_counters SET value = GREATEST(value, $2) + 1, updated_at = NOW() WHERE counter_key = $1 RETURNING value",
      [type, seedCounterFloor(type)],
    );
    const counterValue = counterResult.rows[0].value;
    const label = toTicketLabel(type, counterValue);
    const phoneDigits = phone.replace(/\D/g, "");

    const insertResult = await client.query(
      `INSERT INTO submissions (label, type, name, phone, phone_digits, service_id, desk_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, completed_at, served_by_member_id, served_by_member_name, status_updated_at, created_at`,
      [label, type, name, phone, phoneDigits, serviceId || null, deskId == null ? null : String(deskId)],
    );

    await client.query("COMMIT");

    return {
      submission: mapSubmissionRow(insertResult.rows[0]),
      counterValue,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listSubmissions(limit = 100) {
  // Settings can be created or corrected after the backend starts. Repair any
  // legacy waiting tickets before returning the queue so they do not disappear
  // merely because their original row predates authoritative counter routing.
  await assignUnassignedQueuedSubmissions();

  const result = await pool.query(
    `SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, completed_at, served_by_member_id, served_by_member_name, status_updated_at, created_at
     FROM submissions
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapSubmissionRow);
}

export async function getSubmissionById(id) {
  const result = await pool.query(
    `SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, completed_at, served_by_member_id, served_by_member_name, status_updated_at, created_at
     FROM submissions
     WHERE id::text = $1
     LIMIT 1`,
    [String(id)],
  );

  return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
}

export async function getSubmissionByLabel(label) {
  const result = await pool.query(
    `SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, completed_at, served_by_member_id, served_by_member_name, status_updated_at, created_at
     FROM submissions
     WHERE label = $1
     LIMIT 1`,
    [String(label)],
  );

  return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
}

export async function updateSubmissionStatus(id, status, deskId = null, servedBy = {}) {
  const servedByMemberId = servedBy?.memberId ? String(servedBy.memberId) : null;
  const servedByMemberName = servedBy?.memberName ? String(servedBy.memberName) : null;
  const result = await pool.query(
    `WITH updated AS (
       UPDATE submissions
       SET status = $2,
           desk_id = CASE
             WHEN $3::text IS NOT NULL THEN $3::text
             ELSE desk_id
           END,
           called_at = CASE
             WHEN $2 = 'queued' THEN NULL
             WHEN $2 = 'called' THEN NOW()
             ELSE called_at
           END,
           started_at = CASE
             WHEN $2 IN ('queued', 'called') THEN NULL
             WHEN $2 = 'serving' AND (status <> 'serving' OR started_at IS NULL) THEN NOW()
             ELSE started_at
           END,
           completed_at = CASE
             WHEN $2 = 'completed' THEN NOW()
             WHEN $2 IN ('queued', 'called', 'serving') THEN NULL
             ELSE completed_at
           END,
           served_by_member_id = CASE
             WHEN $2 IN ('serving', 'completed') THEN COALESCE($4::text, served_by_member_id)
             WHEN $2 IN ('queued', 'called') THEN NULL
             ELSE served_by_member_id
           END,
           served_by_member_name = CASE
             WHEN $2 IN ('serving', 'completed') THEN COALESCE($5::text, served_by_member_name)
             WHEN $2 IN ('queued', 'called') THEN NULL
             ELSE served_by_member_name
           END,
           status_updated_at = NOW()
       WHERE id::text = $1
       RETURNING id, label, type, name, phone, phone_digits, service_id, desk_id, status,
                 called_at, started_at, completed_at, served_by_member_id, served_by_member_name,
                 status_updated_at, created_at
     ),
     recorded AS (
       INSERT INTO service_history (
         submission_id, service_id, desk_id, member_id, member_name, ticket_type,
         created_at, called_at, started_at, completed_at, wait_ms, service_ms
       )
       SELECT id::text, service_id, desk_id, served_by_member_id, served_by_member_name, type,
              created_at, called_at, started_at, completed_at,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (COALESCE(called_at, started_at) - created_at)) * 1000))::bigint,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000))::bigint
       FROM updated
       WHERE status = 'completed'
         AND started_at IS NOT NULL
         AND completed_at > started_at
       ON CONFLICT (submission_id, started_at) DO UPDATE
       SET member_id = EXCLUDED.member_id,
           member_name = EXCLUDED.member_name,
           completed_at = EXCLUDED.completed_at,
           wait_ms = EXCLUDED.wait_ms,
           service_ms = EXCLUDED.service_ms
       RETURNING id
     )
     SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status,
            called_at, started_at, completed_at, served_by_member_id, served_by_member_name,
            status_updated_at, created_at
     FROM updated`,
    [String(id), status, deskId == null ? null : String(deskId), servedByMemberId, servedByMemberName],
  );

  return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
}

export async function getWaitEstimates() {
  const now = Date.now();
  const { history, tickets, desks, forecastAt } = await loadWaitModelInputs();
  return buildWaitEstimates({
    history,
    tickets,
    desks,
    now,
    forecastAt,
    timeZone: waitEstimateTimeZone,
  });
}

export async function clearSubmissions() {
  await pool.query("TRUNCATE submissions, ticket_counters, queue_count_events, service_assignment_state RESTART IDENTITY");
}

export async function getSubmissionStats() {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE type = 'general')::int AS general,
       COUNT(*) FILTER (WHERE type = 'priority')::int AS priority
     FROM submissions`,
  );

  return result.rows[0];
}

export async function getLiveQueueCounts() {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status IN ('queued', 'called'))::int AS waiting,
       COUNT(*) FILTER (WHERE status = 'serving')::int AS serving
     FROM submissions`,
  );

  const row = result.rows[0] || {};
  return {
    waiting: Number(row.waiting || 0),
    serving: Number(row.serving || 0),
    timestamp: Date.now(),
  };
}

export async function recordQueueCountEvent(eventType, submissionId = null) {
  const counts = await getLiveQueueCounts();
  const result = await pool.query(
    `INSERT INTO queue_count_events (event_type, submission_id, waiting, serving)
     VALUES ($1, $2, $3, $4)
     RETURNING id, event_type, submission_id, waiting, serving, event_at`,
    [eventType, submissionId == null ? null : String(submissionId), counts.waiting, counts.serving],
  );

  return mapQueueCountEventRow(result.rows[0]);
}

export async function listQueueCountEvents(limit = 500) {
  const result = await pool.query(
    `SELECT id, event_type, submission_id, waiting, serving, event_at
     FROM queue_count_events
     ORDER BY event_at DESC, id DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapQueueCountEventRow).reverse();
}

export async function getAppSettings() {
  const result = await pool.query("SELECT settings_key, value FROM app_settings");

  return result.rows.reduce((settings, row) => {
    settings[row.settings_key] = row.value;
    return settings;
  }, {});
}

export async function saveAppSettings(settings) {
  const entries = Object.entries(settings);
  if (entries.length === 0) return;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const [key, value] of entries) {
      await client.query(
        `INSERT INTO app_settings (settings_key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (settings_key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
