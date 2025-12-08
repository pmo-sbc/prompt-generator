-- Fix Instagram Hashtag Generator Template
-- Updates all Instagram Hashtag Generator templates to use {{total}} placeholder instead of hardcoded "10"

UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are an Instagram influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total}} high performing Instagram hashtags for the following text: "{{instagram_post}}".',
    inputs = '[{"name":"instagram_post","type":"textarea","label":"Instagram Post","placeholder":"Enter Instagram post text","required":true},{"name":"total","type":"number","label":"Total","placeholder":"10","required":true,"default":"10"}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Instagram Hashtag Generator';

-- Verify the update
SELECT id, name, 
       CASE 
         WHEN prompt_template LIKE '%{{total}}%' THEN '✓ Uses placeholder'
         WHEN prompt_template LIKE '%generate 10%' THEN '✗ Still has hardcoded 10'
         ELSE '⚠️ Check manually'
       END as status
FROM templates 
WHERE name = 'Instagram Hashtag Generator'
ORDER BY id DESC;

