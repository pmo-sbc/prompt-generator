-- Add Manager Role Migration
-- This adds the is_manager column to the users table
-- Run with: sudo -u postgres psql -d prompt_generator -f add-manager-role.sql

-- Add is_manager column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_manager'
  ) THEN
    ALTER TABLE users ADD COLUMN is_manager BOOLEAN DEFAULT FALSE;
    COMMENT ON COLUMN users.is_manager IS 'Manager role - can manage user approvals but is a regular user';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_manager';

