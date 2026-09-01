-- Lotus Attune — Postgres schema (Supabase).
--
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- (or, from a terminal: npm run db:migrate)
--
-- Everything the studio dashboard writes and the public site reads lives here.
-- The prototype kept this in localStorage, which cannot work: a booking made on
-- a client's phone would never reach Silvana's laptop.

-- ---------------------------------------------------------------------------
-- Settings: one row, edited from Pricing & availability, published to the site.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  id                 BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  private_session    INTEGER NOT NULL DEFAULT 340,
  private_package    INTEGER NOT NULL DEFAULT 1200,
  per_participant    INTEGER NOT NULL DEFAULT 280,
  team_addon         INTEGER NOT NULL DEFAULT 500,
  refreshments       INTEGER NOT NULL DEFAULT 20,
  deposit            INTEGER NOT NULL DEFAULT 500,
  slot_morning       BOOLEAN NOT NULL DEFAULT TRUE,
  slot_midday        BOOLEAN NOT NULL DEFAULT TRUE,
  slot_evening       BOOLEAN NOT NULL DEFAULT TRUE,
  lead_time_days     INTEGER NOT NULL DEFAULT 5,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO settings (id) VALUES (TRUE) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Dates Silvana has closed. Struck through and unclickable on the booking page.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocked_dates (
  day DATE PRIMARY KEY
);

-- Individual discovery-call time slots Silvana has closed for a specific
-- date (e.g. she already has something else on at that time), distinct
-- from blocked_dates which closes a whole day for session bookings.
CREATE TABLE IF NOT EXISTS blocked_call_times (
  call_date DATE NOT NULL,
  call_time TEXT NOT NULL,
  PRIMARY KEY (call_date, call_time)
);

-- ---------------------------------------------------------------------------
-- Discount codes. Group bookings (2+) only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
  code        TEXT PRIMARY KEY,
  percent_off INTEGER NOT NULL CHECK (percent_off BETWEEN 1 AND 100),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO discount_codes (code, percent_off) VALUES
  ('WELCOME20', 20),
  ('WELCOME30', 30),
  ('LOTUS20',   20),
  ('LOTUS30',   30)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Booking requests. Both Book and the landing page write here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  company         TEXT,
  message         TEXT,
  participants    INTEGER NOT NULL,
  session_date    DATE,
  session_time    TEXT,
  -- Groups above 12 run across two sessions.
  session_date_2  DATE,
  session_time_2  TEXT,
  team_addon      BOOLEAN NOT NULL DEFAULT FALSE,
  refreshments    BOOLEAN NOT NULL DEFAULT FALSE,
  discount_code   TEXT,
  estimated_total INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new_enquiry',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table predates the company field - add it for existing databases.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company TEXT;

CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC);

-- ---------------------------------------------------------------------------
-- Gift certificate requests.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gift_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name  TEXT NOT NULL,
  recipient_email TEXT,
  buyer_email     TEXT NOT NULL,
  format          TEXT NOT NULL,
  sessions        INTEGER,
  participants    INTEGER,
  addons          JSONB NOT NULL DEFAULT '{}'::JSONB,
  total           INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table predates the recipient's own email - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- ---------------------------------------------------------------------------
-- Discovery call requests. A fixed video link is sent by email, not stored
-- per row - see src/lib/email.ts.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discovery_calls (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT,
  company           TEXT,
  call_date         DATE NOT NULL,
  call_time         TEXT NOT NULL,
  message           TEXT,
  status            TEXT NOT NULL DEFAULT 'scheduled',
  -- Lets a client reschedule their own call from a link in the
  -- confirmation email, without any login - the token is the credential.
  reschedule_token  UUID NOT NULL DEFAULT gen_random_uuid(),
  -- Google Calendar event id, so a reschedule/cancel/delete can update or
  -- remove the matching event instead of leaving a stale one behind.
  calendar_event_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table predates the company field - add it for existing databases.
ALTER TABLE discovery_calls ADD COLUMN IF NOT EXISTS company TEXT;

-- Table predates self-serve reschedule - add it for existing databases.
ALTER TABLE discovery_calls ADD COLUMN IF NOT EXISTS reschedule_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS discovery_calls_reschedule_token_idx ON discovery_calls (reschedule_token);

-- Table predates Google Calendar sync - add it for existing databases.
ALTER TABLE discovery_calls ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;

-- Belt-and-suspenders against two people booking the same slot at nearly
-- the same instant - the application checks first, this catches the race.
CREATE UNIQUE INDEX IF NOT EXISTS discovery_calls_slot_idx ON discovery_calls (call_date, call_time) WHERE status != 'cancelled';

-- ---------------------------------------------------------------------------
-- Reviews. `is_published` controls whether each shows on the public site.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  meta         TEXT NOT NULL,
  body         TEXT NOT NULL,
  face         TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Contact messages from "Request a call".
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  message    TEXT NOT NULL,
  handled    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

