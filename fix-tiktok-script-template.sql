-- Fix TikTok Script Writer Template
-- Updates all TikTok Script Writer templates to use {{length}} placeholder instead of hardcoded "90 seconds"

UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are a TikTok marketer and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please write me a TikTok video script for the topic "{{topic}}". The target audience is "{{audience}}". The length of the video should be {{length}} long. The script needs to have a catchy title, follow the best practice of TikTok videos, and get as much traction from the target audience as possible.',
    inputs = '[{"name":"topic","type":"text","label":"Topic","placeholder":"Enter topic","required":true},{"name":"audience","type":"text","label":"Audience","placeholder":"Enter target audience","required":true},{"name":"length","type":"text","label":"Length","placeholder":"90 seconds","required":true,"default":"90 seconds"}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'TikTok Script Writer';

-- Verify the update
SELECT id, name, 
       CASE 
         WHEN prompt_template LIKE '%{{length}}%' THEN '✓ Uses placeholder'
         WHEN prompt_template LIKE '%90 seconds%' THEN '✗ Still has hardcoded 90 seconds'
         ELSE '⚠️ Check manually'
       END as status
FROM templates 
WHERE name = 'TikTok Script Writer'
ORDER BY id DESC;

