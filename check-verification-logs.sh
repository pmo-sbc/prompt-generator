#!/bin/bash
# Script to check verification-related logs

echo "=== Checking PM2 logs for verification attempts ==="
pm2 logs --lines 500 | grep -i "verification\|token\|verify-email" | tail -50

echo ""
echo "=== Checking for recent verification API calls ==="
pm2 logs --lines 500 | grep -i "/api/verify-email" | tail -20

echo ""
echo "=== Checking for token-related errors ==="
pm2 logs --err --lines 500 | grep -i "token\|verification" | tail -20

