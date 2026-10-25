-- Discovery-call times Silvana opens by hand on a day she blocked for events.
-- A manual event block no longer closes discovery calls: on such a day only the
-- times listed here are offered. Days not blocked are unaffected.
CREATE TABLE IF NOT EXISTS discovery_call_open_times (
  call_date DATE NOT NULL,
  call_time TEXT NOT NULL,
  PRIMARY KEY (call_date, call_time)
);
ALTER TABLE discovery_call_open_times ENABLE ROW LEVEL SECURITY;
