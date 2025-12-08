-- AI Prompt Templates Database Export
-- Generated: 2025-10-17T15:35:12.009Z
-- This SQL file can be used to recreate the database on production

-- Enable foreign keys
PRAGMA foreign_keys = ON;


-- Table: users
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    verification_token TEXT,
    verification_token_expires DATETIME,
    is_admin BOOLEAN DEFAULT 0,
    email_verified BOOLEAN DEFAULT 0,
    tokens INTEGER DEFAULT 100
  );

INSERT INTO users (id, username, email, password, created_at, verification_token, verification_token_expires, is_admin, email_verified, tokens) VALUES (6, 'admin', 'admin@prompttemplates.local', '$2b$10$HKdgmyBxhIfLHf2/vY011.3luy6HyhyZnLw3wCTLAirEWL4lUYlqK', '2025-10-16 17:39:46', NULL, NULL, 1, 1, 100);
INSERT INTO users (id, username, email, password, created_at, verification_token, verification_token_expires, is_admin, email_verified, tokens) VALUES (11, 'diego', 'diego.rivera@sbc-servicesinc.com', '$2b$10$94k.f3QCiWuS5FNTJpclDev6ZXvSRziIAWC/lUyxng7xc9LlWcsc6', '2025-10-16 18:43:41', NULL, NULL, 0, 1, 100);


-- Table: saved_prompts
CREATE TABLE saved_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    inputs JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

INSERT INTO saved_prompts (id, user_id, template_name, category, prompt_text, inputs, created_at) VALUES (1, 11, 'Executive Summary', 'Business - Reports', 'You are an executive communication specialist. Create a compelling executive summary:

Topic: 
Key Findings: 

Provide a concise summary (300-500 words) that includes:
1. Overview/background
2. Key findings (3-5 main points)
3. Implications
4. Recommendations
5. Call to action

Write for busy executives - clear, impactful, and actionable.', '{"topic":"asdas","key_findings":"asdas"}', '2025-10-16 19:26:36');


-- Table: usage_stats
CREATE TABLE usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    template_name TEXT NOT NULL,
    category TEXT NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );


-- Table: templates
CREATE TABLE templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      description TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      inputs JSON NOT NULL,
      is_premium BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (1, 'AIDA Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the AIDA framework (Attention, Interest, Desire and Action)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty AIDA (Attention, Interest, Desire and Action) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (2, 'PAS Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the PAS framework (Problem, Agitate and Solution)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty PAS (Problem, Agitate and Solution) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (3, 'BAB Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the BAB framework (Before, After, Bridge)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty BAB (Before, After, Bridge) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (4, 'FAB Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the FAB framework (Features, Advantages, Benefits)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty FAB (Features, Advantages, Benefits) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (5, 'Create Buyer Persona', 'Marketing', 'Miscellaneous', 'Create a detailed buyer personal for your business', 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that speaks and writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "User Description". Below the subheading "User Description", write a detailed paragraph of at least 200 words describing the persona you created. Now create a subheading called "Psychographics". Below the subheading, you need to create a table with the 2 columns and 9 rows with the following format: Column 1 = Data points (Personal characteristics, Hobbies, Interests, Personal aspirations, Professional goals, Pains, Main challenges, Needs, Dreams), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Shopping behaviors". Below the subheading, you need to create a table with the 2 columns and 8 rows with the following format: Column 1 = Data points (Budget, Shopping frequency, Preferred channels, Online behavior, Search terms, Preferred brands, Triggers, Barriers), Column 2 = Answers for each data point in Column 1 based on the specific market "". Please make sure that your response is well-formatted using the Markdown format. Do not use bullet points. Do not self reference. Do not explain what you are doing.', '[{"name":"sell","label":"What do you sell?","type":"input"},{"name":"where","label":"Where do you sell?","type":"input"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (6, 'Create Long-Form Sales Letter', 'Marketing', 'Miscellaneous', 'Create a long-form sales letter for persona', 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Sales Letter for above persona". Below this generate a long form sales letter of around 400 words using this persona. Do not self reference. Do not explain what you are doing.', '[{"name":"sell","label":"What do you sell?","type":"input"},{"name":"where","label":"Where do you sell?","type":"input"},{"name":"words","label":"Total Words","type":"number","value":"400"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (7, 'Create Video Sales Letter (VSL)', 'Marketing', 'Miscellaneous', 'Create a video sales letter (VSL) for persona', 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Video Sales Letter (VSL) for above persona". Below this generate a complete youtube video script in second person of around 1200 words using this persona. In the relevant segment ask the viewer to click the subscribe button. Do not self reference. Do not explain what you are doing.', '[{"name":"sell","label":"What do you sell?","type":"input"},{"name":"where","label":"Where do you sell?","type":"input"},{"name":"words","label":"Total Words","type":"number","value":"1200"},{"name":"cta","label":"Call to Action","type":"input","value":"to click the subscribe button"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (8, 'Business Model Canvas ♦', 'Marketing', 'Miscellaneous', 'Business Model Canvas', 'Please ignore all previous instructions. I want you to respond only in the english language Do not self reference. Do not explain what you are doing.

You are an expert digital marketing consultant. Please create a comprehensive business model canvas for the company "". Present detailed answers in a table replicating the standard consulting format. Ensure all responses are in english and focused on providing value.', '[{"name":"details","label":"Business Details","type":"textarea"}]', 1, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (9, 'Startup Ideas', 'Marketing', 'Ideation', 'Generate Startup ideas for a target audience', 'Please ignore all previous instructions. Please respond only in the english language. I would like you to take on the role of a market research expert proficient in english. .

Generate a list of five distinct startup ideas tailored to the specific needs of my target audience within the category of "". Each idea should include:

A unique and engaging name.
An emoji that captures the essence of the idea.
A strong and compelling vision statement.
Additionally, explain how each idea addresses the needs of "". Ensure the concepts are persuasive enough to capture the interest of potential investors. All your output shall be in english language. Do not self reference. Do not explain what you are doing.', '[{"name":"category","label":"Category","type":"input"},{"name":"audience","label":"Target audience","type":"input"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (10, 'Product Ideas', 'Marketing', 'Ideation', 'Generate product ideas for a target audience', 'Please ignore all previous instructions. Please respond only in the english language. I want you to take on the role of a market research expert who is fluent in english.

With comprehensive knowledge of all markets, including those in english, generate five innovative products tailored to the specific needs of the audience. The category is "" and the target audience is "". All your output shall be in english language. Do not self reference. Do not explain what you are doing.', '[{"name":"category","label":"Category","type":"input"},{"name":"audience","label":"Target audience","type":"input"}]', 0, 1, '2025-10-16 14:58:28', '2025-10-16 14:58:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (11, 'Press Release', 'Marketing', 'Public Relations', 'Generate a press release to announce a new product launch to the media', 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.

You are a PR specialist. You also have a clear and concise writing style. Please write a press release announcing the launch of "". Highlighting its key features, benefits, and availability date. Include a compelling headline and a call to action for media inquiries.', '[{"name":"product","label":"Product Name and Details","type":"textarea"}]', 0, 1, '2025-10-16 14:58:29', '2025-10-16 14:58:29');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (12, 'Find Influencers', 'Marketing', 'Influencer Marketing', 'Generate a list of suitable influencers for an upcoming campaign', 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.

You are an influencer marketing strategist. Please identify and describe potential influencers in the "" who align with the brand''s values and target audience. Include follower demographics, and platform focus.

Brand Details: ""', '[{"name":"niche","label":"Industry/Niche","type":"input"},{"name":"brand","label":"Brand Details","type":"textarea"}]', 0, 1, '2025-10-16 14:58:29', '2025-10-16 14:58:29');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (13, 'Influencer Outreach', 'Marketing', 'Influencer Marketing', 'Create an influencer outreach email to invite collaboration', 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.

You are an influencer outreach coordinator. Please write a personalized outreach email to "" to invite them to collaborate on a "". Include a short brand intro, campaign details, expected deliverables, and a friendly call to action.', '[{"name":"influencer","label":"Influencer Name","type":"input"},{"name":"campaign","label":"Product/Campaign","type":"textarea"}]', 0, 1, '2025-10-16 14:58:29', '2025-10-16 14:58:29');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (14, 'AIDA Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the AIDA framework (Attention, Interest, Desire and Action)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty AIDA (Attention, Interest, Desire and Action) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 15:15:24', '2025-10-16 15:15:24');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (15, 'PAS Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the PAS framework (Problem, Agitate and Solution)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty PAS (Problem, Agitate and Solution) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 15:15:24', '2025-10-16 15:15:24');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (16, 'BAB Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the BAB framework (Before, After, Bridge)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty BAB (Before, After, Bridge) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 15:15:24', '2025-10-16 15:15:24');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (17, 'FAB Framework', 'Marketing', 'Frameworks', 'Create a marketing strategy for your business using the FAB framework (Features, Advantages, Benefits)', 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty FAB (Features, Advantages, Benefits) marketing campaign for ""', '[{"name":"business","label":"Describe your business/product","type":"textarea"}]', 0, 1, '2025-10-16 15:15:24', '2025-10-16 15:15:24');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (18, 'Create Buyer Persona', 'Marketing', 'Miscellaneous', 'Create a detailed buyer personal for your business', 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that speaks and writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "User Description". Below the subheading "User Description", write a detailed paragraph of at least 200 words describing the persona you created. Now create a subheading called "Psychographics". Below the subheading, you need to create a table with the 2 columns and 9 rows with the following format: Column 1 = Data points (Personal characteristics, Hobbies, Interests, Personal aspirations, Professional goals, Pains, Main challenges, Needs, Dreams), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Shopping behaviors". Below the subheading, you need to create a table with the 2 columns and 8 rows with the following format: Column 1 = Data points (Budget, Shopping frequency, Preferred channels, Online behavior, Search terms, Preferred brands, Triggers, Barriers), Column 2 = Answers for each data point in Column 1 based on the specific market "". Please make sure that your response is well-formatted using the Markdown format. Do not use bullet points. Do not self reference. Do not explain what you are doing.', '[{"name":"sell","label":"What do you sell?","type":"input"},{"name":"where","label":"Where do you sell?","type":"input"}]', 0, 1, '2025-10-16 15:15:24', '2025-10-16 15:15:24');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (19, 'Create Long-Form Sales Letter', 'Marketing', 'Miscellaneous', 'Create a long-form sales letter for persona', 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Sales Letter for above persona". Below this generate a long form sales letter of around 400 words using this persona. Do not self reference. Do not explain what you are doing.', '[{"name":"sell","label":"What do you sell?","type":"input"},{"name":"where","label":"Where do you sell?","type":"input"},{"name":"words","label":"Total Words","type":"number","value":"400"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (20, 'Create Video Sales Letter (VSL)', 'Marketing', 'Miscellaneous', 'Create a video sales letter (VSL) for persona', 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Video Sales Letter (VSL) for above persona". Below this generate a complete youtube video script in second person of around 1200 words using this persona. In the relevant segment ask the viewer to click the subscribe button. Do not self reference. Do not explain what you are doing.', '[{"name":"sell","label":"What do you sell?","type":"input"},{"name":"where","label":"Where do you sell?","type":"input"},{"name":"words","label":"Total Words","type":"number","value":"1200"},{"name":"cta","label":"Call to Action","type":"input","value":"to click the subscribe button"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (21, 'Business Model Canvas ♦', 'Marketing', 'Miscellaneous', 'Business Model Canvas', 'Please ignore all previous instructions. I want you to respond only in the english language Do not self reference. Do not explain what you are doing.

You are an expert digital marketing consultant. Please create a comprehensive business model canvas for the company "". Present detailed answers in a table replicating the standard consulting format. Ensure all responses are in english and focused on providing value.', '[{"name":"details","label":"Business Details","type":"textarea"}]', 1, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (22, 'Startup Ideas', 'Marketing', 'Ideation', 'Generate Startup ideas for a target audience', 'Please ignore all previous instructions. Please respond only in the english language. I would like you to take on the role of a market research expert proficient in english. .

Generate a list of five distinct startup ideas tailored to the specific needs of my target audience within the category of "". Each idea should include:

A unique and engaging name.
An emoji that captures the essence of the idea.
A strong and compelling vision statement.
Additionally, explain how each idea addresses the needs of "". Ensure the concepts are persuasive enough to capture the interest of potential investors. All your output shall be in english language. Do not self reference. Do not explain what you are doing.', '[{"name":"category","label":"Category","type":"input"},{"name":"audience","label":"Target audience","type":"input"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (23, 'Product Ideas', 'Marketing', 'Ideation', 'Generate product ideas for a target audience', 'Please ignore all previous instructions. Please respond only in the english language. I want you to take on the role of a market research expert who is fluent in english.

With comprehensive knowledge of all markets, including those in english, generate five innovative products tailored to the specific needs of the audience. The category is "" and the target audience is "". All your output shall be in english language. Do not self reference. Do not explain what you are doing.', '[{"name":"category","label":"Category","type":"input"},{"name":"audience","label":"Target audience","type":"input"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (24, 'Press Release', 'Marketing', 'Public Relations', 'Generate a press release to announce a new product launch to the media', 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.

You are a PR specialist. You also have a clear and concise writing style. Please write a press release announcing the launch of "". Highlighting its key features, benefits, and availability date. Include a compelling headline and a call to action for media inquiries.', '[{"name":"product","label":"Product Name and Details","type":"textarea"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (25, 'Find Influencers', 'Marketing', 'Influencer Marketing', 'Generate a list of suitable influencers for an upcoming campaign', 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.

You are an influencer marketing strategist. Please identify and describe potential influencers in the "" who align with the brand''s values and target audience. Include follower demographics, and platform focus.

Brand Details: ""', '[{"name":"niche","label":"Industry/Niche","type":"input"},{"name":"brand","label":"Brand Details","type":"textarea"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (26, 'Influencer Outreach', 'Marketing', 'Influencer Marketing', 'Create an influencer outreach email to invite collaboration', 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.

You are an influencer outreach coordinator. Please write a personalized outreach email to "" to invite them to collaborate on a "". Include a short brand intro, campaign details, expected deliverables, and a friendly call to action.', '[{"name":"influencer","label":"Influencer Name","type":"input"},{"name":"campaign","label":"Product/Campaign","type":"textarea"}]', 0, 1, '2025-10-16 15:15:25', '2025-10-16 15:15:25');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (27, 'Function Generator', 'Development', 'Code Generation', 'Generate a function implementation based on requirements', 'You are an expert software engineer proficient in . Generate a clean, well-documented function that meets the following requirements:



Provide:
1. The complete function code with proper syntax
2. Input/output examples
3. Time/space complexity analysis
4. Edge cases handled

Do not include explanations outside the code comments.', '[{"name":"language","label":"Programming Language","type":"input"},{"name":"requirements","label":"Function Requirements","type":"textarea"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (28, 'Code Review', 'Development', 'Code Generation', 'Get a comprehensive code review with suggestions for improvement', 'You are a senior software engineer conducting a code review. Analyze the following code:

```

```

Context: 

Provide:
1. Overall code quality assessment
2. Bugs or potential issues
3. Performance improvements
4. Security concerns
5. Best practices recommendations
6. Refactoring suggestions

Be constructive and specific.', '[{"name":"code","label":"Code to Review","type":"textarea"},{"name":"context","label":"Context (optional)","type":"textarea"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (29, 'Bug Fixer', 'Development', 'Code Generation', 'Identify and fix bugs in your code', 'You are a debugging expert. Analyze this code that has a bug:

```

```

Error message: 

Provide:
1. Identification of the bug(s)
2. Explanation of why it occurs
3. Fixed version of the code
4. How to prevent similar bugs in the future

Be clear and concise.', '[{"name":"code","label":"Code with Bug","type":"textarea"},{"name":"error","label":"Error Message (if any)","type":"textarea"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (30, 'Unit Test Generator', 'Development', 'Code Generation', 'Generate comprehensive unit tests for your code', 'You are a test automation expert. Generate comprehensive unit tests using  for this code:

```

```

Provide:
1. Complete test suite with multiple test cases
2. Edge cases and boundary conditions
3. Mock data if needed
4. Setup and teardown if required

Ensure tests follow best practices and have good coverage.', '[{"name":"code","label":"Code to Test","type":"textarea"},{"name":"framework","label":"Testing Framework","type":"input","value":"Jest"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (31, 'API Documentation', 'Development', 'Documentation', 'Generate comprehensive API documentation', 'You are a technical documentation specialist. Create comprehensive API documentation for:



Provide:
1. Endpoint description and purpose
2. HTTP method and URL
3. Request parameters (path, query, body)
4. Request/response examples
5. Status codes and error responses
6. Authentication requirements

Format in clear markdown.', '[{"name":"endpoint","label":"API Endpoint Code/Description","type":"textarea"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (32, 'README Generator', 'Development', 'Documentation', 'Generate a comprehensive README.md for your project', 'You are a technical writer. Create a comprehensive README.md for a project called "" that uses .

Project description: 

Include:
1. Project title and description
2. Features list
3. Installation instructions
4. Usage examples
5. Configuration
6. Contributing guidelines
7. License information

Format in proper markdown.', '[{"name":"project","label":"Project Name","type":"input"},{"name":"description","label":"Project Description","type":"textarea"},{"name":"tech","label":"Technologies Used","type":"input"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (33, 'Blog Post Outline', 'Content Writing', 'Blog Posts', 'Create a detailed outline for a blog post', 'You are an expert content strategist. Create a detailed blog post outline for:

Topic: 
Target Audience: 
SEO Keywords: 

Provide:
1. Compelling headline (with 3 alternatives)
2. Meta description (150-160 characters)
3. Introduction hook
4. Main sections with subheadings
5. Key points for each section
6. Conclusion strategy
7. Call-to-action suggestions

Ensure SEO optimization and reader engagement.', '[{"name":"topic","label":"Blog Post Topic","type":"input"},{"name":"audience","label":"Target Audience","type":"input"},{"name":"keywords","label":"SEO Keywords (comma separated)","type":"input"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (34, 'Full Blog Post', 'Content Writing', 'Blog Posts', 'Write a complete blog post ready for publishing', 'You are an expert blog writer. Write a complete, engaging blog post:

Topic: 
Word Count: ~
Tone: 

Provide:
1. SEO-optimized headline
2. Engaging introduction
3. Well-structured body with subheadings
4. Practical examples or case studies
5. Strong conclusion
6. Clear call-to-action

Use markdown formatting. Write naturally and engagingly.', '[{"name":"topic","label":"Blog Post Topic","type":"input"},{"name":"words","label":"Target Word Count","type":"number","value":"1000"},{"name":"tone","label":"Tone (professional/casual/friendly)","type":"input","value":"professional"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (35, 'Content Repurposer', 'Content Writing', 'Blog Posts', 'Repurpose existing content for different platforms', 'You are a content repurposing expert. Transform this content for :

Original Content:


Create platform-specific versions that:
1. Match platform best practices
2. Optimize for character limits
3. Include appropriate hashtags
4. Maintain core message
5. Engage each platform''s audience

Provide separate versions for each platform.', '[{"name":"content","label":"Original Content","type":"textarea"},{"name":"platforms","label":"Target Platforms (e.g., Twitter, LinkedIn, Instagram)","type":"input"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (36, 'Social Media Post', 'Content Writing', 'Social Media', 'Create engaging social media posts for any platform', 'You are a social media expert. Create an engaging  post:

Topic: 
Call to Action: 

Provide:
1. Main post copy (platform-appropriate length)
2. Relevant hashtags
3. Emoji usage (if appropriate for platform)
4. Image/visual suggestions
5. Best posting time recommendation

Make it engaging and shareable.', '[{"name":"platform","label":"Platform (Twitter/LinkedIn/Instagram/Facebook)","type":"input"},{"name":"topic","label":"Post Topic/Message","type":"textarea"},{"name":"cta","label":"Call to Action","type":"input"}]', 0, 1, '2025-10-16 15:15:26', '2025-10-16 15:15:26');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (37, 'Social Media Campaign', 'Content Writing', 'Social Media', 'Plan a complete social media campaign', 'You are a social media strategist. Create a comprehensive -day campaign for :

Goal: 

Provide:
1. Campaign theme and messaging
2. Daily post schedule
3. Content types for each day
4. Hashtag strategy
5. Engagement tactics
6. Success metrics
7. Sample posts for each day

Ensure variety and consistent engagement.', '[{"name":"goal","label":"Campaign Goal","type":"input"},{"name":"duration","label":"Duration (days)","type":"number","value":"7"},{"name":"platforms","label":"Platforms","type":"input"}]', 1, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (38, 'Email Newsletter', 'Content Writing', 'Email', 'Write an engaging email newsletter', 'You are an email marketing specialist. Create an engaging newsletter:

Topic: 
Audience: 
Sections: 

Provide:
1. Compelling subject line (with 2 alternatives)
2. Preview text
3. Personalized greeting
4.  main sections with content
5. Clear call-to-action
6. Sign-off

Keep it scannable and engaging.', '[{"name":"topic","label":"Newsletter Topic","type":"input"},{"name":"audience","label":"Audience","type":"input"},{"name":"sections","label":"Number of Sections","type":"number","value":"3"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (39, 'Cold Outreach Email', 'Content Writing', 'Email', 'Write a cold outreach email that gets responses', 'You are a cold outreach expert. Write a personalized cold email:

Recipient: 
Purpose: 

Provide:
1. Attention-grabbing subject line
2. Personalized opening
3. Value proposition
4. Social proof (if applicable)
5. Clear call-to-action
6. Professional sign-off

Keep it concise (under 150 words) and focused on the recipient''s needs.', '[{"name":"recipient","label":"Recipient Info (name, company, role)","type":"textarea"},{"name":"purpose","label":"Outreach Purpose","type":"textarea"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (40, 'SWOT Analysis', 'Business', 'Strategy', 'Conduct a comprehensive SWOT analysis for your business', 'You are a business strategy consultant. Conduct a comprehensive SWOT analysis:

Business: 
Industry: 

Provide detailed analysis in table format:

1. Strengths - Internal positive attributes
2. Weaknesses - Internal limitations
3. Opportunities - External favorable factors
4. Threats - External challenges

For each quadrant, provide:
- 5-7 specific points
- Brief explanation
- Strategic implications

Include actionable recommendations.', '[{"name":"business","label":"Business/Project Description","type":"textarea"},{"name":"industry","label":"Industry","type":"input"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (41, 'Competitive Analysis', 'Business', 'Strategy', 'Analyze competitors and identify market positioning', 'You are a competitive intelligence analyst. Analyze the competitive landscape:

Your Company: 
Competitors: 
Target Market: 

Provide:
1. Competitor overview table (features, pricing, strengths, weaknesses)
2. Market positioning map
3. Competitive advantages analysis
4. Gap opportunities
5. Differentiation strategies
6. Recommendations for competitive edge

Be thorough and strategic.', '[{"name":"company","label":"Your Company","type":"input"},{"name":"competitors","label":"Main Competitors (comma separated)","type":"input"},{"name":"market","label":"Target Market","type":"input"}]', 1, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (42, 'Business Proposal', 'Business', 'Proposals', 'Write a professional business proposal', 'You are a business proposal writer. Create a professional proposal:

Client: 
Project: 
Timeline: 

Include:
1. Executive summary
2. Problem statement
3. Proposed solution
4. Deliverables and timeline
5. Methodology/approach
6. Qualifications and experience
7. Investment/pricing structure
8. Next steps

Make it persuasive and client-focused.', '[{"name":"client","label":"Client Name/Company","type":"input"},{"name":"project","label":"Project/Service Description","type":"textarea"},{"name":"timeline","label":"Estimated Timeline","type":"input"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (43, 'Project Proposal', 'Business', 'Proposals', 'Create a detailed project proposal with scope and timeline', 'You are a project manager. Create a comprehensive project proposal:

Project: 
Objectives: 

Provide:
1. Project overview
2. Objectives and success criteria
3. Scope of work
4. Timeline and milestones
5. Resources required
6. Budget estimate
7. Risk assessment
8. Expected outcomes

Use professional formatting.', '[{"name":"project","label":"Project Name and Description","type":"textarea"},{"name":"objectives","label":"Key Objectives","type":"textarea"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (44, 'Executive Summary', 'Business', 'Reports', 'Create an executive summary for reports or presentations', 'You are an executive communication specialist. Create a compelling executive summary:

Topic: 
Key Findings: 

Provide a concise summary (300-500 words) that includes:
1. Overview/background
2. Key findings (3-5 main points)
3. Implications
4. Recommendations
5. Call to action

Write for busy executives - clear, impactful, and actionable.', '[{"name":"topic","label":"Report Topic","type":"input"},{"name":"key_findings","label":"Key Findings/Data","type":"textarea"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (45, 'Lesson Plan', 'Education', 'Lesson Planning', 'Create a comprehensive lesson plan for any subject', 'You are an experienced educator. Create a comprehensive lesson plan:

Subject: 
Grade Level: 
Duration:  minutes

Provide:
1. Learning objectives (specific, measurable)
2. Materials needed
3. Introduction/hook (5-10 min)
4. Main instruction activities (step-by-step)
5. Guided practice
6. Independent practice
7. Assessment methods
8. Differentiation strategies
9. Closure/summary

Align with educational best practices.', '[{"name":"subject","label":"Subject/Topic","type":"input"},{"name":"grade","label":"Grade Level","type":"input"},{"name":"duration","label":"Lesson Duration (minutes)","type":"number","value":"45"}]', 0, 1, '2025-10-16 15:15:27', '2025-10-16 15:15:27');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (46, 'Quiz Generator', 'Education', 'Lesson Planning', 'Generate quiz questions on any topic', 'You are an assessment specialist. Create a  quiz on :

Difficulty:  level
Number of Questions: 

Provide:
1. Multiple choice questions (with 4 options each)
2. Correct answers marked
3. Brief explanations for each answer
4. Question variety (recall, comprehension, application)

Format clearly with numbered questions.', '[{"name":"topic","label":"Topic/Subject","type":"input"},{"name":"difficulty","label":"Difficulty Level (easy/medium/hard)","type":"input","value":"medium"},{"name":"questions","label":"Number of Questions","type":"number","value":"10"}]', 0, 1, '2025-10-16 15:15:28', '2025-10-16 15:15:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (47, 'Study Guide', 'Education', 'Study Materials', 'Create a comprehensive study guide for any topic', 'You are an educational content creator. Create a comprehensive study guide:

Topic: 
Level: 

Provide:
1. Topic overview
2. Key concepts and definitions
3. Important formulas/rules (if applicable)
4. Step-by-step explanations
5. Common mistakes to avoid
6. Practice problems/questions
7. Memory aids and mnemonics
8. Additional resources

Make it clear and student-friendly.', '[{"name":"topic","label":"Topic/Subject","type":"textarea"},{"name":"level","label":"Education Level","type":"input"}]', 0, 1, '2025-10-16 15:15:28', '2025-10-16 15:15:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (48, 'Learning Activity', 'Education', 'Study Materials', 'Design an engaging learning activity', 'You are an instructional designer. Create an engaging learning activity:

Topic: 
Activity Type: 
Students: 

Provide:
1. Activity overview and learning goals
2. Materials needed
3. Setup instructions
4. Step-by-step procedures
5. Time allocation
6. Assessment rubric
7. Variations for different learners
8. Reflection questions

Make it interactive and effective.', '[{"name":"topic","label":"Topic","type":"input"},{"name":"type","label":"Activity Type (game/project/experiment/discussion)","type":"input"},{"name":"students","label":"Number of Students","type":"input"}]', 0, 1, '2025-10-16 15:15:28', '2025-10-16 15:15:28');
INSERT INTO templates (id, name, category, subcategory, description, prompt_template, inputs, is_premium, is_active, created_at, updated_at) VALUES (49, 'ELI5 Explainer', 'Education', 'Explanations', 'Explain complex topics in simple terms (Explain Like I''m 5)', 'You are an expert at simplifying complex topics. Explain this concept as if explaining to a 5-year-old:



Provide:
1. Simple, clear explanation using everyday language
2. Relatable analogies and examples
3. Break down into small, digestible parts
4. No jargon or technical terms

Make it understandable and engaging for young learners.', '[{"name":"concept","label":"Complex Concept/Topic","type":"textarea"}]', 0, 1, '2025-10-16 15:15:28', '2025-10-16 15:15:28');


-- Table: user_saved_templates
CREATE TABLE user_saved_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      saved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE CASCADE,
      UNIQUE(user_id, template_id)
    );


-- Table: shared_prompts
CREATE TABLE shared_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      share_token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      template_name TEXT NOT NULL,
      category TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      views INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );


-- Table: sessions
CREATE TABLE sessions
  (
    sid TEXT NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TEXT NOT NULL
  );

INSERT INTO sessions (sid, sess, expire) VALUES ('p1ZxhjCF8cpxdYZq1UVSkun7DRLXJI14', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-10-17T19:10:50.216Z","secure":false,"httpOnly":true,"path":"/","sameSite":"strict"},"userId":11,"username":"diego"}', '2025-10-17T21:39:05.853Z');
INSERT INTO sessions (sid, sess, expire) VALUES ('TqAIfp_rnOIqs2A0yqY-2JRRm8NKa0JV', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-10-17T19:15:16.015Z","secure":false,"httpOnly":true,"path":"/","sameSite":"strict"},"userId":11,"username":"diego"}', '2025-10-17T19:54:56.316Z');
INSERT INTO sessions (sid, sess, expire) VALUES ('TK1_Yi2N8aR3QUP9G-W4eTwF1hDwlZEB', '{"cookie":{"originalMaxAge":86400000,"expires":"2025-10-17T19:55:28.790Z","secure":false,"httpOnly":true,"path":"/","sameSite":"strict"},"userId":6,"username":"admin"}', '2025-10-17T19:55:33.064Z');


-- Indexes
CREATE INDEX idx_saved_prompts_user_id ON saved_prompts(user_id);
CREATE INDEX idx_shared_prompts_token ON shared_prompts(share_token);
CREATE INDEX idx_shared_prompts_user_id ON shared_prompts(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_subcategory ON templates(subcategory);
CREATE INDEX idx_usage_stats_category ON usage_stats(category);
CREATE INDEX idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX idx_user_saved_templates_user_id ON user_saved_templates(user_id);
