-- Add whatsapp_reminder_template to psychologists table
ALTER TABLE psychologists 
ADD COLUMN IF NOT EXISTS whatsapp_reminder_template TEXT;
