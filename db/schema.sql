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
-- Discount codes. A code is either percent-off or a flat amount-off, never
-- both, and applies from its own participant minimum (2+ by default).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discount_codes (
  code             TEXT PRIMARY KEY,
  percent_off      INTEGER CHECK (percent_off BETWEEN 1 AND 100),
  amount_off       INTEGER CHECK (amount_off > 0),
  min_participants INTEGER NOT NULL DEFAULT 2,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (
    (percent_off IS NOT NULL AND amount_off IS NULL) OR
    (percent_off IS NULL AND amount_off IS NOT NULL)
  )
);

INSERT INTO discount_codes (code, percent_off) VALUES
  ('WELCOME10', 10),
  ('LOTUS10',   10)
ON CONFLICT (code) DO NOTHING;

-- Table predates amount_off/min_participants - add them for existing
-- databases, then allow a NULL percent_off so a flat-amount code can omit it.
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS amount_off INTEGER CHECK (amount_off > 0);
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS min_participants INTEGER NOT NULL DEFAULT 2;
ALTER TABLE discount_codes ALTER COLUMN percent_off DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'discount_codes_one_kind'
  ) THEN
    ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_one_kind CHECK (
      (percent_off IS NOT NULL AND amount_off IS NULL) OR
      (percent_off IS NULL AND amount_off IS NOT NULL)
    );
  END IF;
END $$;

-- $100 off for groups of 4+, printed on the business card.
INSERT INTO discount_codes (code, amount_off, min_participants) VALUES
  ('GROUP4', 100, 4)
ON CONFLICT (code) DO NOTHING;

-- 30%-off codes were never used and 20% was too steep - scaled both down
-- to 10% and renamed to match, for any database still on the old set.
UPDATE discount_codes SET code = 'WELCOME10', percent_off = 10 WHERE code = 'WELCOME20';
UPDATE discount_codes SET code = 'LOTUS10', percent_off = 10 WHERE code = 'LOTUS20';
DELETE FROM discount_codes WHERE code IN ('WELCOME30', 'LOTUS30');

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
  -- Private bookings only: a package of four rather than a single session.
  is_package         BOOLEAN NOT NULL DEFAULT FALSE,
  -- First-time organizational clients only, minimum 7 participants - a
  -- different price formula from the regular per-participant group rate.
  is_corporate_intro BOOLEAN NOT NULL DEFAULT FALSE,
  discount_code   TEXT,
  gratuity        INTEGER NOT NULL DEFAULT 0,
  estimated_total INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'new_enquiry',
  -- Google Calendar event ids, one per session - lets a cancel/delete/edit
  -- from the studio keep Silvana's calendar in sync instead of leaving a
  -- stale or duplicate event behind.
  calendar_event_id   TEXT,
  calendar_event_id_2 TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table predates the package/corporate-introductory pricing tiers - add
-- them for existing databases.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_package BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_corporate_intro BOOLEAN NOT NULL DEFAULT FALSE;

-- Table predates the company field - add it for existing databases.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS company TEXT;

-- Table predates the gratuity option - add it for existing databases.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS gratuity INTEGER NOT NULL DEFAULT 0;

-- Table predates Google Calendar sync - add it for existing databases.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calendar_event_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calendar_event_id_2 TEXT;

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
  gratuity        INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table predates the recipient's own email - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Table predates gratuity - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS gratuity INTEGER NOT NULL DEFAULT 0;

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

