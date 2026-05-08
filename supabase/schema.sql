-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Psychologists Table
CREATE TABLE psychologists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    description TEXT,
    photo_url TEXT,
    timezone TEXT DEFAULT 'America/Santiago',
    video_meeting_url TEXT,
    video_meeting_type TEXT CHECK (video_meeting_type IN ('meet', 'zoom')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Event Types
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    price DECIMAL(10,2),
    mode TEXT CHECK (mode IN ('online', 'presencial')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE,
    event_type_id UUID REFERENCES event_types(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    patient_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Availability (Weekly schedule)
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    UNIQUE(psychologist_id, day_of_week)
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- =====================
-- Row Level Security
-- =====================

ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Psychologists: public read by slug, owner write
CREATE POLICY "psychologists_public_read" ON psychologists FOR SELECT USING (true);
CREATE POLICY "psychologists_owner_write" ON psychologists FOR ALL USING (auth.uid() = user_id);

-- Event types: public read, owner write
CREATE POLICY "event_types_public_read" ON event_types FOR SELECT USING (true);
CREATE POLICY "event_types_owner_write" ON event_types FOR ALL
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));

-- Availability: public read, owner write
CREATE POLICY "availability_public_read" ON availability FOR SELECT USING (true);
CREATE POLICY "availability_owner_write" ON availability FOR ALL
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));

-- Patients: anyone can insert (booking flow), owner of appointments can read
CREATE POLICY "patients_insert" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "patients_read_own" ON patients FOR SELECT
  USING (id IN (SELECT patient_id FROM appointments
    WHERE psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid())));

-- Appointments: anyone can insert (booking), owner can read/update
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "appointments_owner_read" ON appointments FOR SELECT
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));
CREATE POLICY "appointments_owner_update" ON appointments FOR UPDATE
  USING (psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid()));

-- Notes: owner only
CREATE POLICY "notes_owner_all" ON notes FOR ALL
  USING (appointment_id IN (SELECT id FROM appointments
    WHERE psychologist_id IN (SELECT id FROM psychologists WHERE user_id = auth.uid())));
