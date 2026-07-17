import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { pad } from "../src/lib/format.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "sql", "schema.sql");

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
    statusUpdatedAt: new Date(row.status_updated_at || row.created_at).getTime(),
    createdAt: new Date(row.created_at).getTime(),
  };
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
}

export async function createSubmission({ name, phone, serviceId, type }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
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
      `INSERT INTO submissions (label, type, name, phone, phone_digits, service_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, status_updated_at, created_at`,
      [label, type, name, phone, phoneDigits, serviceId || null],
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
  const result = await pool.query(
    `SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, status_updated_at, created_at
     FROM submissions
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );

  return result.rows.map(mapSubmissionRow);
}

export async function getSubmissionById(id) {
  const result = await pool.query(
    `SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, status_updated_at, created_at
     FROM submissions
     WHERE id::text = $1
     LIMIT 1`,
    [String(id)],
  );

  return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
}

export async function getSubmissionByLabel(label) {
  const result = await pool.query(
    `SELECT id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, status_updated_at, created_at
     FROM submissions
     WHERE label = $1
     LIMIT 1`,
    [String(label)],
  );

  return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
}

export async function updateSubmissionStatus(id, status, deskId = null) {
  const result = await pool.query(
    `UPDATE submissions
     SET status = $2,
         desk_id = CASE
           WHEN $2 = 'queued' THEN NULL
           WHEN $3::text IS NOT NULL THEN $3::text
           ELSE desk_id
         END,
         called_at = CASE
           WHEN $2 = 'queued' THEN NULL
           WHEN $2 = 'called' THEN NOW()
           ELSE called_at
         END,
         started_at = CASE
           WHEN $2 = 'queued' THEN NULL
           WHEN $2 = 'called' THEN NULL
           WHEN $2 = 'serving' THEN NOW()
           ELSE started_at
         END,
         status_updated_at = NOW()
     WHERE id::text = $1
     RETURNING id, label, type, name, phone, phone_digits, service_id, desk_id, status, called_at, started_at, status_updated_at, created_at`,
    [String(id), status, deskId == null ? null : String(deskId)],
  );

  return result.rows[0] ? mapSubmissionRow(result.rows[0]) : null;
}

export async function clearSubmissions() {
  await pool.query("TRUNCATE submissions, ticket_counters, queue_count_events RESTART IDENTITY");
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
