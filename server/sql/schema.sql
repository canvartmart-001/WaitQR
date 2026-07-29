CREATE TABLE IF NOT EXISTS ticket_counters (
  counter_key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_assignment_state (
  service_id TEXT PRIMARY KEY,
  last_desk_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('general', 'priority')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_digits TEXT NOT NULL,
  service_id TEXT,
  desk_id TEXT,
  joined_position INTEGER,
  status TEXT NOT NULL DEFAULT 'queued',
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  served_by_member_id TEXT,
  served_by_member_name TEXT,
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS desk_id TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS joined_position INTEGER;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS served_by_member_id TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS served_by_member_name TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE submissions AS ticket
SET joined_position = (
  SELECT COUNT(*)::int + 1
  FROM submissions AS earlier
  WHERE earlier.status = 'queued'
    AND earlier.desk_id IS NOT DISTINCT FROM ticket.desk_id
    AND (
      (ticket.type = 'general' AND earlier.type = 'priority')
      OR (
        earlier.type = ticket.type
        AND (earlier.created_at, earlier.id) < (ticket.created_at, ticket.id)
      )
    )
)
WHERE ticket.joined_position IS NULL
  AND ticket.status = 'queued';

CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_phone_digits_idx ON submissions (phone_digits);
CREATE INDEX IF NOT EXISTS submissions_live_queue_idx
  ON submissions (desk_id, status, created_at)
  WHERE status IN ('queued', 'called', 'serving');

CREATE TABLE IF NOT EXISTS service_history (
  id BIGSERIAL PRIMARY KEY,
  submission_id TEXT NOT NULL,
  service_id TEXT,
  desk_id TEXT,
  member_id TEXT,
  member_name TEXT,
  ticket_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  wait_ms BIGINT NOT NULL,
  service_ms BIGINT NOT NULL,
  UNIQUE (submission_id, started_at)
);

CREATE INDEX IF NOT EXISTS service_history_completed_at_idx ON service_history (completed_at DESC);
CREATE INDEX IF NOT EXISTS service_history_service_idx ON service_history (service_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS service_history_member_service_idx
  ON service_history (member_id, service_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS service_history_desk_service_idx
  ON service_history (desk_id, service_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS queue_count_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  submission_id TEXT,
  waiting INTEGER NOT NULL DEFAULT 0,
  serving INTEGER NOT NULL DEFAULT 0,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS queue_count_events_event_at_idx ON queue_count_events (event_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  settings_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

UPDATE app_settings AS members_settings
SET value = staff_settings.value,
    updated_at = NOW()
FROM app_settings AS staff_settings
WHERE members_settings.settings_key = 'members'
  AND staff_settings.settings_key = 'staff'
  AND CASE
    WHEN jsonb_typeof(members_settings.value) = 'array' THEN jsonb_array_length(members_settings.value)
    ELSE 0
  END = 0
  AND CASE
    WHEN jsonb_typeof(staff_settings.value) = 'array' THEN jsonb_array_length(staff_settings.value)
    ELSE 0
  END > 0;

INSERT INTO app_settings (settings_key, value, updated_at)
SELECT 'members', value, NOW()
FROM app_settings
WHERE settings_key = 'staff'
  AND NOT EXISTS (SELECT 1 FROM app_settings WHERE settings_key = 'members');

DELETE FROM app_settings WHERE settings_key = 'staff';
