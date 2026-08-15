-- Lotus Attune — Vercel Postgres schema.
--
-- Apply with:  npm run db:migrate
-- (or paste into the Query tab of the Postgres store in the Vercel dashboard)
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

CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC);

-- ---------------------------------------------------------------------------
-- Gift certificate requests.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gift_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_name TEXT NOT NULL,
  buyer_email    TEXT NOT NULL,
  format         TEXT NOT NULL,
  sessions       INTEGER,
  participants   INTEGER,
  addons         JSONB NOT NULL DEFAULT '{}'::JSONB,
  total          INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'requested',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ---------------------------------------------------------------------------
-- Client review notes, left by pinning a spot on the live site in review mode.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Where on the site.
  path        TEXT NOT NULL,
  -- CSS path to the element that was clicked, so the note can be traced back
  -- to a specific component rather than a coordinate on a screenshot.
  selector    TEXT NOT NULL,
  -- Text inside that element, which is usually the fastest way to find it.
  context     TEXT,
  -- Position within the element, 0-100, so the pin can be redrawn at any width.
  x_percent   NUMERIC(5,2) NOT NULL,
  y_percent   NUMERIC(5,2) NOT NULL,
  viewport_w  INTEGER,
  note        TEXT NOT NULL,
  author      TEXT,
  status      TEXT NOT NULL DEFAULT 'open',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback_notes (status, created_at DESC);
