-- Fix user_sessions table structure for connect-pg-simple
-- This fixes the "column sid does not exist" error

-- Drop the incorrectly created table if it exists
DROP TABLE IF EXISTS user_sessions CASCADE;

-- Create the correct table structure for connect-pg-simple
CREATE TABLE user_sessions (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);

-- Create index on expire for performance
CREATE INDEX idx_user_sessions_expire ON user_sessions(expire);

-- Verify the table structure
\d user_sessions

