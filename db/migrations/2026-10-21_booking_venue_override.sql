-- Optional per-booking room. NULL (the default, and every existing booking)
-- keeps the headcount rule: 6 or fewer = Private Wellness Lounge, 7 or more =
-- Premium Signature Venue. Set only when the room confirmed differs.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS venue_override TEXT
  CHECK (venue_override IN ('lounge', 'signature'));
