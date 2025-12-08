# Template Blueprint Fixes Summary

All fixes updated the `templates` table in the database. Here's what was fixed:

## Fixes Applied (Local Database)

### Individual Template Fixes:
1. **VSL (Video Sales Letter) Template** - IDs: 78, 119, 160
   - Fixed: Added `{{sell}}`, `{{where}}`, `{{words}}`, `{{cta}}` placeholders
   - Files: `fix-vsl-template.js`, `fix-vsl-template.sql`

2. **Facebook Group Post** - IDs: 77, 118
   - Fixed: Replaced hardcoded "5" with `{{total_posts}}`
   - Files: `fix-facebook-template.js`, `fix-facebook-template.sql`

3. **Instagram Hashtag Generator** - IDs: 83, 124
   - Fixed: Replaced hardcoded "10" with `{{total}}`
   - Files: `fix-instagram-hashtag-template.js`, `fix-instagram-hashtag-template.sql`

4. **Instagram Post Calendar** - ID: 82
   - Fixed: Added `{{total_months}}` and `{{articles_per_week}}`
   - Files: `fix-instagram-calendar-template.js`, `fix-instagram-calendar-template.sql`

5. **TikTok Script Writer** - IDs: 99, 140, 181
   - Fixed: Replaced hardcoded "less than 90 seconds long" with `{{length}}`
   - Files: `fix-tiktok-script-template.js`, `fix-tiktok-script-template.sql`

6. **Twitter Convert Article to Twitter Thread (Paste URL)** - IDs: 105, 146, 187
   - Fixed: Changed `{{input_1.content}}` to `{{webpage_url}}`
   - Files: `fix-twitter-thread-url-template.js`, `fix-twitter-thread-url-template.sql`

7. **YouTube Ads Generator** - IDs: 114, 155, 196 (and 3 more)
   - Fixed: Added `{{headlines_length}}`, `{{description_length}}`, `{{youtube_video_url}}`
   - Files: `fix-youtube-ads-template.js`, `fix-youtube-ads-template.sql`

8. **YouTube Title & Descriptions** - IDs: 111, 152, 193
   - Fixed: Replaced hardcoded "click the subscribe button" with `{{call_to_action}}`
   - Files: `fix-youtube-title-desc-cta.js`, `fix-youtube-title-desc-cta.sql`

### Bulk Fixes:
9. **All LinkedIn Templates** - 12 templates fixed
   - Fixed: Added placeholders for `length`, `total`, `posts_per_week`, `total_months`, `post_length`
   - Files: `fix-all-linkedin-templates-v2.js`

10. **All Social Media Templates** - 36+ templates fixed
    - Fixed: Added placeholders for various number fields across Facebook, Pinterest, TikTok, Twitter, YouTube
    - Files: `fix-all-social-media-templates.js`, `fix-remaining-templates-final.js`

## To Apply Fixes to Production

You have two options:

### Option 1: Run SQL Files (Recommended)
```bash
cd /var/www/prompt-generator

# Apply each fix
psql -h localhost -U postgres -d prompt_generator -f fix-vsl-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-facebook-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-instagram-hashtag-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-instagram-calendar-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-tiktok-script-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-twitter-thread-url-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-youtube-ads-template.sql
psql -h localhost -U postgres -d prompt_generator -f fix-youtube-title-desc-cta.sql
```

### Option 2: Run Node.js Scripts
```bash
cd /var/www/prompt-generator

# Make sure .env is configured for production database
node fix-vsl-template.js
node fix-facebook-template.js
node fix-instagram-hashtag-template.js
node fix-instagram-calendar-template.js
node fix-tiktok-script-template.js
node fix-twitter-thread-url-template.js
node fix-youtube-ads-template.js
node fix-youtube-title-desc-cta.js

# For bulk fixes
node fix-all-linkedin-templates-v2.js
node fix-all-social-media-templates.js
node fix-remaining-templates-final.js
```

## Verify Fixes Applied

Check if fixes are applied:
```bash
psql -h localhost -U postgres -d prompt_generator -c "
  SELECT id, name, 
         CASE 
           WHEN prompt_template LIKE '%{{call_to_action}}%' THEN 'Has CTA'
           WHEN prompt_template LIKE '%{{total}}%' THEN 'Has total'
           WHEN prompt_template LIKE '%{{length}}%' THEN 'Has length'
           ELSE 'Check needed'
         END as placeholder_status
  FROM templates
  WHERE name IN ('YouTube Title & Descriptions', 'Facebook Group Post', 'Instagram Hashtag Generator')
  ORDER BY id;
"
```

## Database Table Updated

**Table Name:** `templates`

**Field Updated:** `prompt_template` (TEXT field)

**Total Templates Fixed:** 50+ templates across multiple social media platforms

