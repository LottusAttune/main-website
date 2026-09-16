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
  buyer_name      TEXT,
  buyer_email     TEXT NOT NULL,
  format          TEXT NOT NULL,
  sessions        INTEGER,
  participants    INTEGER,
  addons          JSONB NOT NULL DEFAULT '{}'::JSONB,
  discount_code   TEXT,
  code            TEXT,
  total           INTEGER NOT NULL DEFAULT 0,
  gratuity        INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'requested',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table predates the recipient's own email - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Table predates gratuity - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS gratuity INTEGER NOT NULL DEFAULT 0;

-- Table predates discount codes - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- Table predates the buyer's own name (previously only their email) - add
-- it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS buyer_name TEXT;

-- Table predates the certificate's own redemption code (the certificate
-- used to tell the recipient to "enter this code" without one existing
-- anywhere) - add it for existing databases.
ALTER TABLE gift_requests ADD COLUMN IF NOT EXISTS code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS gift_requests_code_idx ON gift_requests (code);

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


-- ---------------------------------------------------------------------------
-- Business details printed on proposals and invoices, plus the automation
-- switches. All additive with defaults, so an existing database keeps
-- working untouched until Silvana fills them in from Settings.
-- ---------------------------------------------------------------------------
ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_name         TEXT NOT NULL DEFAULT 'Lotus Attune';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_address      TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_email        TEXT NOT NULL DEFAULT 'info@lotusattune.com';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS business_phone        TEXT NOT NULL DEFAULT '416-871-5610';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_label             TEXT NOT NULL DEFAULT 'HST';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_number            TEXT NOT NULL DEFAULT '';
-- 0 until she confirms registration; Ontario HST is 13.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS tax_rate_percent      NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS payment_instructions  TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_due_days      INTEGER NOT NULL DEFAULT 7;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_prefix        TEXT NOT NULL DEFAULT 'LA';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_footer        TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS proposal_intro        TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS proposal_valid_days   INTEGER NOT NULL DEFAULT 14;
-- Automation: send the proposal the moment a booking request lands, and
-- send the invoice the moment a proposal is accepted. Both off by default
-- so she reviews first until she chooses otherwise.
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_send_proposals   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS auto_send_invoices    BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- Proposals, invoices and gift certificates. One table: the paperwork for a
-- booking or a gift request, with its own public token (the link in the
-- client's email), the rendered PDF, and the timestamps that drive status.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind             TEXT NOT NULL CHECK (kind IN ('proposal', 'invoice', 'certificate')),
  number           TEXT NOT NULL,
  booking_id       UUID REFERENCES bookings(id) ON DELETE CASCADE,
  gift_id          UUID REFERENCES gift_requests(id) ON DELETE CASCADE,
  client_name      TEXT NOT NULL,
  client_email     TEXT NOT NULL,
  client_company   TEXT,
  -- draft | sent | accepted | declined | paid | void
  status           TEXT NOT NULL DEFAULT 'draft',
  -- [{ "label": "...", "amount": 1250 }]
  lines            JSONB NOT NULL DEFAULT '[]'::JSONB,
  subtotal         INTEGER NOT NULL DEFAULT 0,
  tax_rate         NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax              INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'CAD',
  issued_on        DATE NOT NULL DEFAULT CURRENT_DATE,
  due_on           DATE,
  notes            TEXT,
  token            UUID NOT NULL DEFAULT gen_random_uuid(),
  pdf              BYTEA,
  pdf_generated_at TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  sent_to          TEXT,
  viewed_at        TIMESTAMPTZ,
  accepted_at      TIMESTAMPTZ,
  paid_at          TIMESTAMPTZ,
  paid_method      TEXT,
  voided_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS documents_number_idx  ON documents (number);
CREATE UNIQUE INDEX IF NOT EXISTS documents_token_idx   ON documents (token);
CREATE INDEX IF NOT EXISTS documents_booking_idx        ON documents (booking_id);
CREATE INDEX IF NOT EXISTS documents_gift_idx           ON documents (gift_id);
CREATE INDEX IF NOT EXISTS documents_kind_status_idx    ON documents (kind, status);

-- Sequential numbering per kind and year (LA-2026-0001), allocated
-- atomically so two documents can never share a number.
CREATE TABLE IF NOT EXISTS document_counters (
  kind  TEXT    NOT NULL,
  year  INTEGER NOT NULL,
  last  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, year)
);

-- ---------------------------------------------------------------------------
-- Timeline per lead / gift: notes Silvana writes, plus everything the system
-- did on her behalf (proposal sent, viewed, accepted, invoice paid...).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activity (
  id          BIGSERIAL PRIMARY KEY,
  booking_id  UUID REFERENCES bookings(id) ON DELETE CASCADE,
  gift_id     UUID REFERENCES gift_requests(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,
  body        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_booking_idx ON activity (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_gift_idx    ON activity (gift_id, created_at DESC);
-- Notes written on a client's card rather than on one booking.
ALTER TABLE activity ADD COLUMN IF NOT EXISTS client_email TEXT;
CREATE INDEX IF NOT EXISTS activity_client_idx  ON activity (client_email, created_at DESC);

-- ---------------------------------------------------------------------------
-- Payments. E-transfer is the default; card (Stripe) is optional, with a
-- 50% deposit plan whose balance is charged automatically before the session
-- and a late-cancellation fee charged to the card on file.
-- ---------------------------------------------------------------------------
ALTER TABLE settings ADD COLUMN IF NOT EXISTS card_fee_percent     NUMERIC(5,2) NOT NULL DEFAULT 3;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS deposit_percent      INTEGER NOT NULL DEFAULT 50;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS balance_days_before  INTEGER NOT NULL DEFAULT 4;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cancellation_fee     INTEGER NOT NULL DEFAULT 100;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cancellation_hours   INTEGER NOT NULL DEFAULT 72;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS cancellation_policy  TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS venue_details        TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS reminder_days_before INTEGER NOT NULL DEFAULT 2;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS paid_amount            INTEGER NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS payment_plan           TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS stripe_link_full       TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS stripe_link_deposit    TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS stripe_link_full_id    TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS stripe_link_deposit_id TEXT;
-- The outstanding amount the "full" link was minted for, so a link is retired
-- and re-minted the moment the balance changes (deposit paid, lines edited).
ALTER TABLE documents ADD COLUMN IF NOT EXISTS stripe_link_amount     INTEGER;

-- E-signature captured when a client accepts a proposal online.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signer_name   TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signature_png TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS accepted_ip   TEXT;

-- Fully automatic by default: proposal on request, invoice on acceptance.
ALTER TABLE settings ALTER COLUMN auto_send_proposals SET DEFAULT TRUE;
ALTER TABLE settings ALTER COLUMN auto_send_invoices  SET DEFAULT TRUE;

-- Ad-hoc Stripe payment links Silvana creates from the studio (a deposit
-- agreed by phone, a custom package, a workshop) - separate from invoices.
CREATE TABLE IF NOT EXISTS payment_links (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description     TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  client_name     TEXT,
  client_email    TEXT,
  stripe_link_id  TEXT NOT NULL,
  url             TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  paid_at         TIMESTAMPTZ,
  paid_count      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_customer_id          TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_method_id    TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_sent_at        TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at            TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_charged_at          TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS balance_requested_at        TIMESTAMPTZ;
-- The client ticked "I agree to the Terms & Conditions" on the booking form.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS terms_accepted_at           TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_fee_charged_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS payments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id             UUID REFERENCES documents(id) ON DELETE SET NULL,
  booking_id              UUID REFERENCES bookings(id) ON DELETE SET NULL,
  gift_id                 UUID REFERENCES gift_requests(id) ON DELETE SET NULL,
  amount                  INTEGER NOT NULL,
  -- card | e-transfer | cash | other
  method                  TEXT NOT NULL,
  -- payment | deposit | balance | cancellation_fee | refund
  kind                    TEXT NOT NULL DEFAULT 'payment',
  stripe_payment_intent   TEXT,
  stripe_checkout_session TEXT,
  note                    TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payments_intent_idx  ON payments (stripe_payment_intent) WHERE stripe_payment_intent IS NOT NULL;
CREATE INDEX IF NOT EXISTS payments_document_idx       ON payments (document_id);
CREATE INDEX IF NOT EXISTS payments_booking_idx        ON payments (booking_id);
