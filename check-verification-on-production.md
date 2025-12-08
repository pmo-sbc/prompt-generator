# Quick Commands to Check Verification on Production

Run these commands on your production server:

## 1. Check if the updated code is deployed

```bash
cd /var/www/prompt-generator
git status
git log --oneline -5
```

## 2. Check database for user 22's verification token

```bash
psql -h localhost -U postgres -d prompt_generator -c "
  SELECT 
    id, 
    username, 
    email, 
    LEFT(verification_token, 30) || '...' as token_preview,
    verification_token_expires,
    email_verified,
    created_at,
    CASE 
      WHEN verification_token IS NULL THEN 'No token'
      WHEN verification_token_expires IS NULL THEN 'No expiration'
      WHEN verification_token_expires > NOW() THEN 'Valid (not expired)'
      ELSE 'Expired'
    END as token_status
  FROM users
  WHERE id = 22;
"
```

## 3. Check ALL users with verification tokens

```bash
psql -h localhost -U postgres -d prompt_generator -c "
  SELECT 
    id, 
    username, 
    email, 
    verification_token IS NOT NULL as has_token,
    verification_token_expires,
    email_verified,
    created_at
  FROM users
  WHERE verification_token IS NOT NULL
  ORDER BY created_at DESC;
"
```

## 4. Monitor logs in real-time while testing

Open TWO terminal windows:

**Terminal 1 - Watch logs:**
```bash
pm2 logs --lines 0
```

**Terminal 2 - Test verification:**
```bash
# Get the token from database first
TOKEN=$(psql -h localhost -U postgres -d prompt_generator -t -c "SELECT verification_token FROM users WHERE id = 22;")
echo "Token: $TOKEN"

# Test the endpoint directly
curl -X POST http://localhost:3000/api/verify-email \
  -H "Content-Type: application/json" \
  -d "{\"token\": \"$TOKEN\"}"
```

## 5. Restart PM2 to load new code

```bash
pm2 restart prompt-generator
pm2 logs --lines 20
```

## 6. Check if verification endpoint exists

```bash
curl -X POST http://localhost:3000/api/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "test"}'
```

This should return an error, but at least confirms the endpoint is accessible.

## 7. Check Nginx access logs for verification attempts

```bash
sudo tail -f /var/log/nginx/access.log | grep verify
```

