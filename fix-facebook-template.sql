-- Fix Facebook Group Post Template
-- Updates all Facebook Group Post templates to use {{total_posts}} placeholder instead of hardcoded "5"

UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are an expert Facebook marketer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Give me a list of {{total_posts}} interesting and engaging questions to post on my Facebook Group about "{{topic}}".',
    inputs = '[{"name":"topic","type":"text","label":"Topic","placeholder":"Enter your topic","required":true},{"name":"total_posts","type":"number","label":"Total Posts","placeholder":"5","required":true,"default":"5"}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Facebook Group Post';

-- Verify the update
SELECT id, name, 
       CASE 
         WHEN prompt_template LIKE '%{{total_posts}}%' THEN '✓ Uses placeholder'
         WHEN prompt_template LIKE '%list of 5%' THEN '✗ Still has hardcoded 5'
         ELSE '⚠️ Check manually'
       END as status
FROM templates 
WHERE name = 'Facebook Group Post'
ORDER BY id DESC;

