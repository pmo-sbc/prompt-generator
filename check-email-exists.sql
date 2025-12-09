-- Check if email exists in database
-- Run with: sudo -u postgres psql -d prompt_generator -f check-email-exists.sql

-- Replace this email with the one you want to check
\set email 'diegoriveramontano@gmail.com'

-- Check in users table
SELECT 
    'USERS table' as table_name,
    id, 
    username, 
    email, 
    email_verified, 
    is_admin, 
    created_at 
FROM users 
WHERE email = :'email';

-- Check in pending_users table
SELECT 
    'PENDING_USERS table' as table_name,
    id, 
    username, 
    email, 
    status,
    created_at,
    reviewed_at,
    review_notes
FROM pending_users 
WHERE email = :'email';

-- Summary
SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) FROM users WHERE email = :'email') as in_users_table,
    (SELECT COUNT(*) FROM pending_users WHERE email = :'email') as in_pending_users_table;

