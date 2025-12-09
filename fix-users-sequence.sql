-- Fix Users Sequence
-- Resets the users_id_seq sequence to MAX(id) + 1 to prevent duplicate key errors
-- Run with: sudo -u postgres psql -d prompt_generator -f fix-users-sequence.sql

-- Check current sequence value and max ID
SELECT 
    'Current sequence' as info,
    last_value as value,
    is_called
FROM users_id_seq;

SELECT 
    'Max ID in users' as info,
    MAX(id) as value
FROM users;

-- Reset sequence to MAX(id) + 1
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1, false);

-- Verify the fix
SELECT 
    'New sequence value' as info,
    last_value as value,
    is_called,
    'Next ID will be: ' || (last_value + 1) as next_id
FROM users_id_seq;

