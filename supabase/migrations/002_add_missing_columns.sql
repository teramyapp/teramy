-- Create blocked_dates table
CREATE TABLE IF NOT EXISTS blocked_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocked_dates_owner_all" ON blocked_dates;
CREATE POLICY "blocked_dates_owner_all" ON blocked_dates FOR ALL
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));

-- Add missing columns to event_types for the services dashboard
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_first_session_only BOOLEAN DEFAULT false;

-- Add missing columns to psychologists for the profile dashboard
ALTER TABLE psychologists
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT;

-- Remove UNIQUE constraint to allow multiple time slots per day
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_psychologist_id_day_of_week_key;

-- Allow psychologist to read patients they've manually added
ALTER TABLE patients ADD COLUMN IF NOT EXISTS psychologist_id UUID REFERENCES psychologists(id);
DROP POLICY IF EXISTS "patients_owner_read_direct" ON patients;
CREATE POLICY "patients_owner_read_direct" ON patients FOR SELECT
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));

-- Allow psychologist to update their own patients
DROP POLICY IF EXISTS "patients_owner_update" ON patients;
CREATE POLICY "patients_owner_update" ON patients FOR UPDATE
  USING (
    id IN (SELECT patient_id FROM appointments
      WHERE psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()))
    OR psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid())
  );
