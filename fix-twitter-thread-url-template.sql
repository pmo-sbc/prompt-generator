-- Fix Twitter Convert Article to Twitter Thread (Paste URL) Template
-- Updates templates to use {{webpage_url}} placeholder instead of {{input_1.content}}

UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are a professional copywriter and would like to convert your article into an engaging Twitter thread. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Add emojis to the thread when appropriate. The character count for each thread should be between 270 to 280 characters. Please turn the following article into a Twitter thread from the URL: "{{webpage_url}}".',
    inputs = '[{"name":"webpage_url","type":"text","label":"Webpage URL","placeholder":"Enter URL","required":true}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Convert Article to Twitter Thread (Paste URL)';

-- Verify the update
SELECT id, name, 
       CASE 
         WHEN prompt_template LIKE '%{{webpage_url}}%' THEN '✓ Uses {{webpage_url}}'
         WHEN prompt_template LIKE '%{{input_1.content}}%' THEN '✗ Still uses {{input_1.content}}'
         ELSE '⚠️ Check manually'
       END as status
FROM templates 
WHERE name = 'Convert Article to Twitter Thread (Paste URL)'
ORDER BY id DESC;

