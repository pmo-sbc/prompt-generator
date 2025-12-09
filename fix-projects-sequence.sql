-- Fix projects_id_seq sequence
-- Run this in psql: psql -h localhost -U postgres -d prompt_generator -f fix-projects-sequence.sql

-- Check current maximum ID
SELECT MAX(id) as max_id FROM projects;

-- Check current sequence value
SELECT last_value, is_called FROM projects_id_seq;

-- Reset sequence to MAX(id) + 1
SELECT setval('projects_id_seq', (SELECT MAX(id) FROM projects) + 1, false);

-- Verify the fix
SELECT last_value, is_called FROM projects_id_seq;

