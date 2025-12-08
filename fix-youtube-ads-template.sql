-- Fix YouTube Ads Generator Templates
-- Updates all YouTube Ads Generator templates to use {{headlines_length}} and {{description_length}} placeholders

-- Fix Paste Description templates
UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are a copywriter with expertise in YouTube Ads creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate {{total_headlines}} compelling YouTube headlines and {{total_headlines}} compelling descriptions for a video. The headlines should be between {{headlines_length}} long. The descriptions should be between {{description_length}} long. Do not use single quotes, double quotes or any other enclosing characters. The video is about "{{video_description}}".',
    inputs = '[{"name":"total_headlines","type":"number","label":"Total Headlines","placeholder":"10","required":true,"default":"10"},{"name":"headlines_length","type":"text","label":"Headlines Length","placeholder":"90 to 100 characters","required":true,"default":"90 to 100 characters"},{"name":"description_length","type":"text","label":"Description Length","placeholder":"30 to 35 characters","required":true,"default":"30 to 35 characters"},{"name":"video_description","type":"textarea","label":"Video Description","placeholder":"Enter video description","required":true}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'YouTube Ads Generator (Paste Description)';

-- Fix Paste URL templates
UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are a copywriter with expertise in YouTube Ad creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate {{total_headlines}} compelling YouTube headlines and {{total_headlines}} compelling descriptions for a video. The headlines should be between {{headlines_length}} long. The descriptions should be between {{description_length}} long. Do not use single quotes, double quotes or any other enclosing characters. The video is from the URL: "{{youtube_video_url}}".',
    inputs = '[{"name":"total_headlines","type":"number","label":"Total Headlines","placeholder":"10","required":true,"default":"10"},{"name":"headlines_length","type":"text","label":"Headlines Length","placeholder":"90 to 100 characters","required":true,"default":"90 to 100 characters"},{"name":"description_length","type":"text","label":"Description Length","placeholder":"30 to 35 characters","required":true,"default":"30 to 35 characters"},{"name":"youtube_video_url","type":"text","label":"YouTube Video URL","placeholder":"Enter YouTube URL","required":true}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'YouTube Ads Generator (Paste URL)';

-- Verify the update
SELECT id, name, 
       CASE 
         WHEN prompt_template LIKE '%{{headlines_length}}%' AND prompt_template LIKE '%{{description_length}}%' THEN '✓ Uses both placeholders'
         WHEN prompt_template LIKE '%90 to 100 characters%' OR prompt_template LIKE '%30 to 35 characters%' THEN '✗ Still has hardcoded lengths'
         ELSE '⚠️ Check manually'
       END as status
FROM templates 
WHERE name LIKE 'YouTube Ads Generator%'
ORDER BY name, id DESC;

