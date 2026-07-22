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
  status TEXT NOT NULL DEFAULT 'queued',
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS desk_id TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions (created_at DESC);
CREATE INDEX IF NOT EXISTS submissions_phone_digits_idx ON submissions (phone_digits);

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
