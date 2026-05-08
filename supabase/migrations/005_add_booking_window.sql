-- ============================================================
-- 005 · Add booking_window_days to Availability Settings
-- Allows psychologists to restrict how far in advance patients
-- can book sessions (e.g. 7 days, 14 days, 30 days).
-- ============================================================

ALTER TABLE availability_settings
  ADD COLUMN IF NOT EXISTS booking_window_days INTEGER NOT NULL DEFAULT 30;
