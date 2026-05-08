-- Extend appointments.status to include 'pending' (new default) and 'confirmed'
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('pending', 'confirmed', 'scheduled', 'cancelled', 'completed'));
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'pending';

-- Add status column to patients for persistent patient lifecycle state
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Evaluación'
  CHECK (status IN ('En proceso', 'En pausa', 'Alta', 'Evaluación'));
