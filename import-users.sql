-- Import users: ecompean, Jcompean, Cpurchis
-- Run this with: sudo -u postgres psql -d prompt_generator -f import-users.sql

-- Delete existing users if they exist (optional - remove this if you don't want to delete first)
DELETE FROM users WHERE username IN ('ecompean', 'Jcompean', 'Cpurchis');

-- Insert ecompean (ID: 2)
INSERT INTO users (
    id, username, email, password, email_verified,
    verification_token, verification_token_expires,
    password_reset_token, password_reset_token_expires,
    is_admin, tokens, created_at
) VALUES (
    2,
    'ecompean',
    'ely@elycompean.com',
    '$2b$10$uVpeiyWFm52j.AayTaZFd.g78ObFHX.m1BQrx7tHOSoQKJolwJYBS',
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    93,
    '2025-10-22 17:44:21'::timestamp
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    email_verified = EXCLUDED.email_verified,
    is_admin = EXCLUDED.is_admin,
    tokens = EXCLUDED.tokens,
    created_at = EXCLUDED.created_at;

-- Insert Jcompean (ID: 4)
INSERT INTO users (
    id, username, email, password, email_verified,
    verification_token, verification_token_expires,
    password_reset_token, password_reset_token_expires,
    is_admin, tokens, created_at
) VALUES (
    4,
    'Jcompean',
    'johnnycompean@gmail.com',
    '$2b$10$SS/bx.WUb9wuwgCkFm8F5uPfG8tydFn0OYABUlot4zVeIRvDFR3KK',
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    97,
    '2025-10-29 15:26:17'::timestamp
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    email_verified = EXCLUDED.email_verified,
    is_admin = EXCLUDED.is_admin,
    tokens = EXCLUDED.tokens,
    created_at = EXCLUDED.created_at;

-- Insert Cpurchis (ID: 5)
INSERT INTO users (
    id, username, email, password, email_verified,
    verification_token, verification_token_expires,
    password_reset_token, password_reset_token_expires,
    is_admin, tokens, created_at
) VALUES (
    5,
    'Cpurchis',
    'courtney@uniquelyplannedinc.com',
    '$2b$10$QPgji8TzzJDEElBA.C0.yOlPZrwN0D6IBMj74vOz8mrJ/8axnpDTC',
    TRUE,
    NULL,
    NULL,
    NULL,
    NULL,
    FALSE,
    90,
    '2025-10-29 17:31:46'::timestamp
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    password = EXCLUDED.password,
    email_verified = EXCLUDED.email_verified,
    is_admin = EXCLUDED.is_admin,
    tokens = EXCLUDED.tokens,
    created_at = EXCLUDED.created_at;

-- Reset sequence to avoid conflicts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users), true);

-- Verify the import
SELECT id, username, email, is_admin, tokens, created_at FROM users WHERE username IN ('ecompean', 'Jcompean', 'Cpurchis') ORDER BY id;

