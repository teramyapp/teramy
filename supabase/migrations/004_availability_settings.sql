-- ============================================================
-- 004 · Availability Settings
-- Persists buffer_minutes, min_notice_hours, max_sessions_per_day
-- per psychologist so the booking page can honour them.
-- ============================================================

CREATE TABLE IF NOT EXISTS availability_settings (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  psychologist_id      UUID UNIQUE REFERENCES psychologists(id) ON DELETE CASCADE,
  buffer_minutes       INTEGER NOT NULL DEFAULT 10,
  min_notice_hours     INTEGER NOT NULL DEFAULT 24,
  max_sessions_per_day INTEGER NOT NULL DEFAULT 8,
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

-- Public can read settings (needed by the booking page API route via service role,
-- but also allows future direct client reads without leaking PII).
CREATE POLICY "availability_settings_public_read" ON availability_settings
  FOR SELECT USING (true);

-- Only the owner psychologist can insert / update / delete.
CREATE POLICY "availability_settings_owner_write" ON availability_settings
  FOR ALL
  USING (psychologist_id IN (
    SELECT id FROM psychologists WHERE user_id = auth.uid()
  ));

-- ──────────────────────────────────────────────────────────────
-- Make blocked_dates readable by the booking API (service role
-- already bypasses RLS, but add public read for consistency).
-- ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "blocked_dates_public_read" ON blocked_dates;
CREATE POLICY "blocked_dates_public_read" ON blocked_dates
  FOR SELECT USING (true);
