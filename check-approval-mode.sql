-- Check current approval mode setting
SELECT key, value, description FROM settings WHERE key = 'user_approval_enabled';

-- Enable approval mode (run this to turn it ON)
UPDATE settings 
SET value = 'true', updated_at = CURRENT_TIMESTAMP 
WHERE key = 'user_approval_enabled';

-- Disable approval mode (run this to turn it OFF)
-- UPDATE settings 
-- SET value = 'false', updated_at = CURRENT_TIMESTAMP 
-- WHERE key = 'user_approval_enabled';

-- Verify the change
SELECT key, value, description FROM settings WHERE key = 'user_approval_enabled';

