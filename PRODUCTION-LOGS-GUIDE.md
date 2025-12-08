# Production Logs Guide

This guide shows you how to check logs on your production server to debug issues.

## PM2 Logs (Application Logs)

If you're using PM2 to run the application, check logs with:

```bash
# View all logs (real-time)
pm2 logs

# View only error logs
pm2 logs --err

# View only output logs
pm2 logs --out

# View logs for a specific app
pm2 logs ai-prompt-templates

# View last 100 lines
pm2 logs --lines 100

# Save logs to a file
pm2 logs --lines 1000 > /var/log/app-logs.txt
```

## Application Log Files

If the application writes to log files, check:

```bash
# Check if logs directory exists
ls -la /var/www/prompt-generator/logs/

# View latest log file
tail -f /var/www/prompt-generator/logs/app.log

# View last 100 lines
tail -n 100 /var/www/prompt-generator/logs/app.log

# Search for verification errors
grep -i "verification" /var/www/prompt-generator/logs/app.log

# Search for specific token (replace TOKEN with actual token)
grep "TOKEN" /var/www/prompt-generator/logs/app.log
```

## Nginx Logs

If using Nginx as reverse proxy:

```bash
# Access logs
tail -f /var/log/nginx/access.log

# Error logs
tail -f /var/log/nginx/error.log

# Search for specific endpoint
grep "/api/verify-email" /var/log/nginx/access.log
```

## System Logs

```bash
# System journal (if using systemd)
journalctl -u prompt-generator -f

# View last 100 lines
journalctl -u prompt-generator -n 100
```

## Database Logs

PostgreSQL logs:

```bash
# Find PostgreSQL log location
sudo -u postgres psql -c "SHOW log_directory;"
sudo -u postgres psql -c "SHOW log_filename;"

# View PostgreSQL logs (location varies by installation)
sudo tail -f /var/log/postgresql/postgresql-*.log

# Or check in data directory
sudo tail -f /var/lib/postgresql/*/main/log/postgresql-*.log
```

## Quick Diagnostic Commands

### Check if PM2 is running
```bash
pm2 status
pm2 list
```

### Check application process
```bash
ps aux | grep node
```

### Check database connection
```bash
psql -h localhost -U postgres -d prompt_generator -c "SELECT COUNT(*) FROM users;"
```

### Check verification tokens in database
```bash
psql -h localhost -U postgres -d prompt_generator -c "
  SELECT id, username, email, 
         verification_token IS NOT NULL as has_token,
         verification_token_expires,
         email_verified,
         created_at
  FROM users
  WHERE verification_token IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Check recent verification attempts
```bash
# If you have application logs
grep -i "verification" /var/www/prompt-generator/logs/*.log | tail -20
```

## Using the Diagnostic Script

I've created a script to check verification tokens:

```bash
# On production server, navigate to app directory
cd /var/www/prompt-generator

# Run diagnostic script with the token from the URL
node check-verification-token.js <token-from-url>

# Example:
node check-verification-token.js abc123def456...
```

## Real-time Monitoring

### Watch PM2 logs in real-time
```bash
pm2 logs --lines 0
```

### Monitor specific errors
```bash
pm2 logs | grep -i "error\|verification\|token"
```

## Exporting Logs for Analysis

```bash
# Export PM2 logs
pm2 logs --lines 1000 --nostream > /tmp/pm2-logs-$(date +%Y%m%d).txt

# Export application logs
cp /var/www/prompt-generator/logs/app.log /tmp/app-logs-$(date +%Y%m%d).txt

# Compress logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz /var/www/prompt-generator/logs/
```

## Common Issues and Log Locations

1. **Application crashes**: Check `pm2 logs --err`
2. **Database errors**: Check PostgreSQL logs and `pm2 logs`
3. **API errors**: Check `pm2 logs` and Nginx error logs
4. **Verification issues**: Check `pm2 logs` and run diagnostic script

## Tips

- Use `tail -f` to follow logs in real-time
- Use `grep` to filter for specific errors
- Check logs immediately after reproducing the issue
- Save logs before they rotate/clear

