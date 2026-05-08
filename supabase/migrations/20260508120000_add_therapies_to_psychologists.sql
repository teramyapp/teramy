ALTER TABLE psychologists ADD COLUMN IF NOT EXISTS therapies TEXT[] DEFAULT '{}';
