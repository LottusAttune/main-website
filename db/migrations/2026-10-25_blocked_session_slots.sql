-- Block one session window (for example 12 - 2 pm) on one date, instead of
-- the whole day. Whole-day blocks stay in blocked_dates.
CREATE TABLE IF NOT EXISTS blocked_session_slots (
  day        DATE NOT NULL,
  time_label TEXT NOT NULL,
  PRIMARY KEY (day, time_label)
);
ALTER TABLE blocked_session_slots ENABLE ROW LEVEL SECURITY;
