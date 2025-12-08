-- Fix Instagram Post Calendar Template
-- Updates all Instagram Post Calendar templates to use {{total_months}} and {{articles_per_week}} placeholders instead of hardcoded "3"

UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are an Instagrammer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Please create an Instagram Calendar for {{total_months}} months based on your interests "{{topic}}". There should be {{articles_per_week}} Instagram posts scheduled each week of the month. Every Instagram post should have a catchy description. Include emojis and the Instagram hashtags in the description. Try to use unique emojis in the description. The description should have a hook and entice the readers. The table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Post Idea, description, caption without hashtags, hashtags. Please organize each Instagram post in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.',
    inputs = '[{"name":"topic","type":"text","label":"Topic","placeholder":"Enter topic","required":true},{"name":"articles_per_week","type":"number","label":"Articles per week","placeholder":"3","required":true,"default":"3"},{"name":"total_months","type":"number","label":"Total months","placeholder":"3","required":true,"default":"3"}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Instagram Post Calendar';

-- Verify the update
SELECT id, name, 
       CASE 
         WHEN prompt_template LIKE '%{{total_months}}%' AND prompt_template LIKE '%{{articles_per_week}}%' THEN '✓ Uses both placeholders'
         WHEN prompt_template LIKE '%3 months%' OR prompt_template LIKE '%3 Instagram posts%' THEN '✗ Still has hardcoded 3'
         ELSE '⚠️ Check manually'
       END as status
FROM templates 
WHERE name = 'Instagram Post Calendar'
ORDER BY id DESC;

