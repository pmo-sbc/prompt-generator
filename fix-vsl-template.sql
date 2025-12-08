-- Fix VSL Template to use proper placeholders
-- This updates the prompt template to use {{sell}}, {{where}}, {{words}}, and {{cta}} placeholders

UPDATE templates 
SET prompt_template = 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells {{sell}} in {{where}}. First write "User Persona creation for {{sell}} in {{where}}" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market {{where}}. Now create a subheading called "Video Sales Letter (VSL) for above persona". Below this generate a complete youtube video script in second person of around {{words}} words using this persona. In the relevant segment ask the viewer {{cta}}. Do not self reference. Do not explain what you are doing.',
    inputs = '[{"name":"sell","type":"input","label":"What do you sell?"},{"name":"where","type":"input","label":"Where do you sell?"},{"name":"words","type":"number","label":"Total Words","value":"1200"},{"name":"cta","type":"input","label":"Call to Action","value":"to click the subscribe button"}]'::jsonb,
    updated_at = CURRENT_TIMESTAMP
WHERE name = 'Create Video Sales Letter (VSL)';

-- Verify the update
SELECT id, name, prompt_template, inputs FROM templates WHERE name = 'Create Video Sales Letter (VSL)' ORDER BY id DESC LIMIT 1;

