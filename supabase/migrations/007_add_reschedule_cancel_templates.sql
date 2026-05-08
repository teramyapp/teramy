-- Add reschedule and cancel templates to psychologists table
ALTER TABLE psychologists 
ADD COLUMN IF NOT EXISTS whatsapp_reschedule_template TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_cancel_template TEXT;
