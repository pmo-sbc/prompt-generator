#!/bin/bash
# Quick script to check user verification status in database

echo "=== Checking users with verification tokens ==="
psql -h localhost -U postgres -d prompt_generator -c "
  SELECT 
    id, 
    username, 
    email, 
    verification_token IS NOT NULL as has_token,
    verification_token_expires,
    email_verified,
    created_at,
    CASE 
      WHEN verification_token_expires IS NULL THEN 'No expiration'
      WHEN verification_token_expires > NOW() THEN 'Valid'
      ELSE 'Expired'
    END as token_status
  FROM users
  WHERE verification_token IS NOT NULL OR email_verified = FALSE
  ORDER BY created_at DESC
  LIMIT 10;
"

echo ""
echo "=== Recent user registrations (last 5) ==="
psql -h localhost -U postgres -d prompt_generator -c "
  SELECT 
    id, 
    username, 
    email, 
    email_verified,
    created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT 5;
"

