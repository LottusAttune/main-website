-- Groups of 7+ can book by block (7-10, 11-15, 16-20, 21-25) instead of an
-- exact headcount. A block booking stores participants = the top of the
-- block and participants_min = its first number; NULL means an exact count.
-- Additive and nullable: existing rows are untouched and read as exact.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS participants_min INTEGER
  CHECK (participants_min IS NULL OR (participants_min >= 1 AND participants_min <= participants));
