/**
 * Seed Templates Script
 * Populates the database with initial template data
 */

const { initializeDatabase } = require('../db');
const Template = require('../models/Template');
const logger = require('../utils/logger');

// Template data from the existing templates.html
const templateData = {
  "Marketing": {
    "Frameworks": {
      "AIDA Framework": {
        description: "Create a marketing strategy for your business using the AIDA framework (Attention, Interest, Desire and Action)",
        inputs: [
          { name: "business", label: "Describe your business/product", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty AIDA (Attention, Interest, Desire and Action) marketing campaign for ""'
      },
      "PAS Framework": {
        description: "Create a marketing strategy for your business using the PAS framework (Problem, Agitate and Solution)",
        inputs: [
          { name: "business", label: "Describe your business/product", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty PAS (Problem, Agitate and Solution) marketing campaign for ""'
      },
      "BAB Framework": {
        description: "Create a marketing strategy for your business using the BAB framework (Before, After, Bridge)",
        inputs: [
          { name: "business", label: "Describe your business/product", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty BAB (Before, After, Bridge) marketing campaign for ""'
      },
      "FAB Framework": {
        description: "Create a marketing strategy for your business using the FAB framework (Features, Advantages, Benefits)",
        inputs: [
          { name: "business", label: "Describe your business/product", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter that speaks and writes fluent english. Do not self reference. Do not explain what you are doing. Write a witty FAB (Features, Advantages, Benefits) marketing campaign for ""'
      }
    },
    "Miscellaneous": {
      "Create Buyer Persona": {
        description: "Create a detailed buyer personal for your business",
        inputs: [
          { name: "sell", label: "What do you sell?", type: "input" },
          { name: "where", label: "Where do you sell?", type: "input" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that speaks and writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "User Description". Below the subheading "User Description", write a detailed paragraph of at least 200 words describing the persona you created. Now create a subheading called "Psychographics". Below the subheading, you need to create a table with the 2 columns and 9 rows with the following format: Column 1 = Data points (Personal characteristics, Hobbies, Interests, Personal aspirations, Professional goals, Pains, Main challenges, Needs, Dreams), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Shopping behaviors". Below the subheading, you need to create a table with the 2 columns and 8 rows with the following format: Column 1 = Data points (Budget, Shopping frequency, Preferred channels, Online behavior, Search terms, Preferred brands, Triggers, Barriers), Column 2 = Answers for each data point in Column 1 based on the specific market "". Please make sure that your response is well-formatted using the Markdown format. Do not use bullet points. Do not self reference. Do not explain what you are doing.'
      },
      "Create Long-Form Sales Letter": {
        description: "Create a long-form sales letter for persona",
        inputs: [
          { name: "sell", label: "What do you sell?", type: "input" },
          { name: "where", label: "Where do you sell?", type: "input" },
          { name: "words", label: "Total Words", type: "number", value: "400" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells in . First write "User Persona creation for in" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market "". Now create a subheading called "Sales Letter for above persona". Below this generate a long form sales letter of around 400 words using this persona. Do not self reference. Do not explain what you are doing.'
      },
      "Create Video Sales Letter (VSL)": {
        description: "Create a video sales letter (VSL) for persona",
        inputs: [
          { name: "sell", label: "What do you sell?", type: "input" },
          { name: "where", label: "Where do you sell?", type: "input" },
          { name: "words", label: "Total Words", type: "number", value: "1200" },
          { name: "cta", label: "Call to Action", type: "input", value: "to click the subscribe button" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. You are a marketing researcher that writes fluent english. Your task is to generate a detailed USER PERSONA for a business that sells {{sell}} in {{where}}. First write "User Persona creation for {{sell}} in {{where}}" as the heading. Now create a subheading called "Demographics". Below, you need to create a table with the 2 columns and 7 rows with the following format: Column 1 = Data points (Name, Age, Occupation, Annual Income, Marital status, Family situation, Location), Column 2 = Answers for each data point in Column 1 based on the specific market {{where}}. Now create a subheading called "Video Sales Letter (VSL) for above persona". Below this generate a complete youtube video script in second person of around {{words}} words using this persona. In the relevant segment ask the viewer {{cta}}. Do not self reference. Do not explain what you are doing.'
      },
      "Business Model Canvas ♦": {
        description: "Business Model Canvas",
        premium: true,
        inputs: [
          { name: "details", label: "Business Details", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. I want you to respond only in the english language Do not self reference. Do not explain what you are doing.\n\nYou are an expert digital marketing consultant. Please create a comprehensive business model canvas for the company "". Present detailed answers in a table replicating the standard consulting format. Ensure all responses are in english and focused on providing value.'
      }
    },
    "Ideation": {
      "Startup Ideas": {
        description: "Generate Startup ideas for a target audience",
        inputs: [
          { name: "category", label: "Category", type: "input" },
          { name: "audience", label: "Target audience", type: "input" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. I would like you to take on the role of a market research expert proficient in english. .\n\nGenerate a list of five distinct startup ideas tailored to the specific needs of my target audience within the category of "". Each idea should include:\n\nA unique and engaging name.\nAn emoji that captures the essence of the idea.\nA strong and compelling vision statement.\nAdditionally, explain how each idea addresses the needs of "". Ensure the concepts are persuasive enough to capture the interest of potential investors. All your output shall be in english language. Do not self reference. Do not explain what you are doing.'
      },
      "Product Ideas": {
        description: "Generate product ideas for a target audience",
        inputs: [
          { name: "category", label: "Category", type: "input" },
          { name: "audience", label: "Target audience", type: "input" }
        ],
        prompt: 'Please ignore all previous instructions. Please respond only in the english language. I want you to take on the role of a market research expert who is fluent in english.\n\nWith comprehensive knowledge of all markets, including those in english, generate five innovative products tailored to the specific needs of the audience. The category is "" and the target audience is "". All your output shall be in english language. Do not self reference. Do not explain what you are doing.'
      }
    },
    "Public Relations": {
      "Press Release": {
        description: "Generate a press release to announce a new product launch to the media",
        inputs: [
          { name: "product", label: "Product Name and Details", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.\n\nYou are a PR specialist. You also have a clear and concise writing style. Please write a press release announcing the launch of "". Highlighting its key features, benefits, and availability date. Include a compelling headline and a call to action for media inquiries.'
      }
    },
    "Influencer Marketing": {
      "Find Influencers": {
        description: "Generate a list of suitable influencers for an upcoming campaign",
        inputs: [
          { name: "niche", label: "Industry/Niche", type: "input" },
          { name: "brand", label: "Brand Details", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.\n\nYou are an influencer marketing strategist. Please identify and describe potential influencers in the "" who align with the brand\'s values and target audience. Include follower demographics, and platform focus.\n\nBrand Details: ""'
      },
      "Influencer Outreach": {
        description: "Create an influencer outreach email to invite collaboration",
        inputs: [
          { name: "influencer", label: "Influencer Name", type: "input" },
          { name: "campaign", label: "Product/Campaign", type: "textarea" }
        ],
        prompt: 'Please ignore all previous instructions. I want you to respond only in the english language. Do not repeat yourself. Do not self reference. Do not explain what you are doing.\n\nYou are an influencer outreach coordinator. Please write a personalized outreach email to "" to invite them to collaborate on a "". Include a short brand intro, campaign details, expected deliverables, and a friendly call to action.'
      }
    }
  }
  /* DISABLED CATEGORIES - Only Marketing is active
  ,
  "Development": {
    "Code Generation": {
      "Function Generator": {
        description: "Generate a function implementation based on requirements",
        inputs: [
          { name: "language", label: "Programming Language", type: "input" },
          { name: "requirements", label: "Function Requirements", type: "textarea" }
        ],
        prompt: 'You are an expert software engineer proficient in . Generate a clean, well-documented function that meets the following requirements:\n\n\n\nProvide:\n1. The complete function code with proper syntax\n2. Input/output examples\n3. Time/space complexity analysis\n4. Edge cases handled\n\nDo not include explanations outside the code comments.'
      },
      "Code Review": {
        description: "Get a comprehensive code review with suggestions for improvement",
        inputs: [
          { name: "code", label: "Code to Review", type: "textarea" },
          { name: "context", label: "Context (optional)", type: "textarea" }
        ],
        prompt: 'You are a senior software engineer conducting a code review. Analyze the following code:\n\n```\n\n```\n\nContext: \n\nProvide:\n1. Overall code quality assessment\n2. Bugs or potential issues\n3. Performance improvements\n4. Security concerns\n5. Best practices recommendations\n6. Refactoring suggestions\n\nBe constructive and specific.'
      },
      "Bug Fixer": {
        description: "Identify and fix bugs in your code",
        inputs: [
          { name: "code", label: "Code with Bug", type: "textarea" },
          { name: "error", label: "Error Message (if any)", type: "textarea" }
        ],
        prompt: 'You are a debugging expert. Analyze this code that has a bug:\n\n```\n\n```\n\nError message: \n\nProvide:\n1. Identification of the bug(s)\n2. Explanation of why it occurs\n3. Fixed version of the code\n4. How to prevent similar bugs in the future\n\nBe clear and concise.'
      },
      "Unit Test Generator": {
        description: "Generate comprehensive unit tests for your code",
        inputs: [
          { name: "code", label: "Code to Test", type: "textarea" },
          { name: "framework", label: "Testing Framework", type: "input", value: "Jest" }
        ],
        prompt: 'You are a test automation expert. Generate comprehensive unit tests using  for this code:\n\n```\n\n```\n\nProvide:\n1. Complete test suite with multiple test cases\n2. Edge cases and boundary conditions\n3. Mock data if needed\n4. Setup and teardown if required\n\nEnsure tests follow best practices and have good coverage.'
      }
    },
    "Documentation": {
      "API Documentation": {
        description: "Generate comprehensive API documentation",
        inputs: [
          { name: "endpoint", label: "API Endpoint Code/Description", type: "textarea" }
        ],
        prompt: 'You are a technical documentation specialist. Create comprehensive API documentation for:\n\n\n\nProvide:\n1. Endpoint description and purpose\n2. HTTP method and URL\n3. Request parameters (path, query, body)\n4. Request/response examples\n5. Status codes and error responses\n6. Authentication requirements\n\nFormat in clear markdown.'
      },
      "README Generator": {
        description: "Generate a comprehensive README.md for your project",
        inputs: [
          { name: "project", label: "Project Name", type: "input" },
          { name: "description", label: "Project Description", type: "textarea" },
          { name: "tech", label: "Technologies Used", type: "input" }
        ],
        prompt: 'You are a technical writer. Create a comprehensive README.md for a project called "" that uses .\n\nProject description: \n\nInclude:\n1. Project title and description\n2. Features list\n3. Installation instructions\n4. Usage examples\n5. Configuration\n6. Contributing guidelines\n7. License information\n\nFormat in proper markdown.'
      }
    }
  },
  "Content Writing": {
    "Blog Posts": {
      "Blog Post Outline": {
        description: "Create a detailed outline for a blog post",
        inputs: [
          { name: "topic", label: "Blog Post Topic", type: "input" },
          { name: "audience", label: "Target Audience", type: "input" },
          { name: "keywords", label: "SEO Keywords (comma separated)", type: "input" }
        ],
        prompt: 'You are an expert content strategist. Create a detailed blog post outline for:\n\nTopic: \nTarget Audience: \nSEO Keywords: \n\nProvide:\n1. Compelling headline (with 3 alternatives)\n2. Meta description (150-160 characters)\n3. Introduction hook\n4. Main sections with subheadings\n5. Key points for each section\n6. Conclusion strategy\n7. Call-to-action suggestions\n\nEnsure SEO optimization and reader engagement.'
      },
      "Full Blog Post": {
        description: "Write a complete blog post ready for publishing",
        inputs: [
          { name: "topic", label: "Blog Post Topic", type: "input" },
          { name: "words", label: "Target Word Count", type: "number", value: "1000" },
          { name: "tone", label: "Tone (professional/casual/friendly)", type: "input", value: "professional" }
        ],
        prompt: 'You are an expert blog writer. Write a complete, engaging blog post:\n\nTopic: \nWord Count: ~\nTone: \n\nProvide:\n1. SEO-optimized headline\n2. Engaging introduction\n3. Well-structured body with subheadings\n4. Practical examples or case studies\n5. Strong conclusion\n6. Clear call-to-action\n\nUse markdown formatting. Write naturally and engagingly.'
      },
      "Content Repurposer": {
        description: "Repurpose existing content for different platforms",
        inputs: [
          { name: "content", label: "Original Content", type: "textarea" },
          { name: "platforms", label: "Target Platforms (e.g., Twitter, LinkedIn, Instagram)", type: "input" }
        ],
        prompt: 'You are a content repurposing expert. Transform this content for :\n\nOriginal Content:\n\n\nCreate platform-specific versions that:\n1. Match platform best practices\n2. Optimize for character limits\n3. Include appropriate hashtags\n4. Maintain core message\n5. Engage each platform\'s audience\n\nProvide separate versions for each platform.'
      }
    },
    "Social Media": {
      "Social Media Post": {
        description: "Create engaging social media posts for any platform",
        inputs: [
          { name: "platform", label: "Platform (Twitter/LinkedIn/Instagram/Facebook)", type: "input" },
          { name: "topic", label: "Post Topic/Message", type: "textarea" },
          { name: "cta", label: "Call to Action", type: "input" }
        ],
        prompt: 'You are a social media expert. Create an engaging  post:\n\nTopic: \nCall to Action: \n\nProvide:\n1. Main post copy (platform-appropriate length)\n2. Relevant hashtags\n3. Emoji usage (if appropriate for platform)\n4. Image/visual suggestions\n5. Best posting time recommendation\n\nMake it engaging and shareable.'
      },
      "Social Media Campaign": {
        description: "Plan a complete social media campaign",
        inputs: [
          { name: "goal", label: "Campaign Goal", type: "input" },
          { name: "duration", label: "Duration (days)", type: "number", value: "7" },
          { name: "platforms", label: "Platforms", type: "input" }
        ],
        premium: true,
        prompt: 'You are a social media strategist. Create a comprehensive -day campaign for :\n\nGoal: \n\nProvide:\n1. Campaign theme and messaging\n2. Daily post schedule\n3. Content types for each day\n4. Hashtag strategy\n5. Engagement tactics\n6. Success metrics\n7. Sample posts for each day\n\nEnsure variety and consistent engagement.'
      }
    },
    "Email": {
      "Email Newsletter": {
        description: "Write an engaging email newsletter",
        inputs: [
          { name: "topic", label: "Newsletter Topic", type: "input" },
          { name: "audience", label: "Audience", type: "input" },
          { name: "sections", label: "Number of Sections", type: "number", value: "3" }
        ],
        prompt: 'You are an email marketing specialist. Create an engaging newsletter:\n\nTopic: \nAudience: \nSections: \n\nProvide:\n1. Compelling subject line (with 2 alternatives)\n2. Preview text\n3. Personalized greeting\n4.  main sections with content\n5. Clear call-to-action\n6. Sign-off\n\nKeep it scannable and engaging.'
      },
      "Cold Outreach Email": {
        description: "Write a cold outreach email that gets responses",
        inputs: [
          { name: "recipient", label: "Recipient Info (name, company, role)", type: "textarea" },
          { name: "purpose", label: "Outreach Purpose", type: "textarea" }
        ],
        prompt: 'You are a cold outreach expert. Write a personalized cold email:\n\nRecipient: \nPurpose: \n\nProvide:\n1. Attention-grabbing subject line\n2. Personalized opening\n3. Value proposition\n4. Social proof (if applicable)\n5. Clear call-to-action\n6. Professional sign-off\n\nKeep it concise (under 150 words) and focused on the recipient\'s needs.'
      }
    }
  },
  "Business": {
    "Strategy": {
      "SWOT Analysis": {
        description: "Conduct a comprehensive SWOT analysis for your business",
        inputs: [
          { name: "business", label: "Business/Project Description", type: "textarea" },
          { name: "industry", label: "Industry", type: "input" }
        ],
        prompt: 'You are a business strategy consultant. Conduct a comprehensive SWOT analysis:\n\nBusiness: \nIndustry: \n\nProvide detailed analysis in table format:\n\n1. Strengths - Internal positive attributes\n2. Weaknesses - Internal limitations\n3. Opportunities - External favorable factors\n4. Threats - External challenges\n\nFor each quadrant, provide:\n- 5-7 specific points\n- Brief explanation\n- Strategic implications\n\nInclude actionable recommendations.'
      },
      "Competitive Analysis": {
        description: "Analyze competitors and identify market positioning",
        inputs: [
          { name: "company", label: "Your Company", type: "input" },
          { name: "competitors", label: "Main Competitors (comma separated)", type: "input" },
          { name: "market", label: "Target Market", type: "input" }
        ],
        premium: true,
        prompt: 'You are a competitive intelligence analyst. Analyze the competitive landscape:\n\nYour Company: \nCompetitors: \nTarget Market: \n\nProvide:\n1. Competitor overview table (features, pricing, strengths, weaknesses)\n2. Market positioning map\n3. Competitive advantages analysis\n4. Gap opportunities\n5. Differentiation strategies\n6. Recommendations for competitive edge\n\nBe thorough and strategic.'
      }
    },
    "Proposals": {
      "Business Proposal": {
        description: "Write a professional business proposal",
        inputs: [
          { name: "client", label: "Client Name/Company", type: "input" },
          { name: "project", label: "Project/Service Description", type: "textarea" },
          { name: "timeline", label: "Estimated Timeline", type: "input" }
        ],
        prompt: 'You are a business proposal writer. Create a professional proposal:\n\nClient: \nProject: \nTimeline: \n\nInclude:\n1. Executive summary\n2. Problem statement\n3. Proposed solution\n4. Deliverables and timeline\n5. Methodology/approach\n6. Qualifications and experience\n7. Investment/pricing structure\n8. Next steps\n\nMake it persuasive and client-focused.'
      },
      "Project Proposal": {
        description: "Create a detailed project proposal with scope and timeline",
        inputs: [
          { name: "project", label: "Project Name and Description", type: "textarea" },
          { name: "objectives", label: "Key Objectives", type: "textarea" }
        ],
        prompt: 'You are a project manager. Create a comprehensive project proposal:\n\nProject: \nObjectives: \n\nProvide:\n1. Project overview\n2. Objectives and success criteria\n3. Scope of work\n4. Timeline and milestones\n5. Resources required\n6. Budget estimate\n7. Risk assessment\n8. Expected outcomes\n\nUse professional formatting.'
      }
    },
    "Reports": {
      "Executive Summary": {
        description: "Create an executive summary for reports or presentations",
        inputs: [
          { name: "topic", label: "Report Topic", type: "input" },
          { name: "key_findings", label: "Key Findings/Data", type: "textarea" }
        ],
        prompt: 'You are an executive communication specialist. Create a compelling executive summary:\n\nTopic: \nKey Findings: \n\nProvide a concise summary (300-500 words) that includes:\n1. Overview/background\n2. Key findings (3-5 main points)\n3. Implications\n4. Recommendations\n5. Call to action\n\nWrite for busy executives - clear, impactful, and actionable.'
      }
    }
  },
  "Education": {
    "Lesson Planning": {
      "Lesson Plan": {
        description: "Create a comprehensive lesson plan for any subject",
        inputs: [
          { name: "subject", label: "Subject/Topic", type: "input" },
          { name: "grade", label: "Grade Level", type: "input" },
          { name: "duration", label: "Lesson Duration (minutes)", type: "number", value: "45" }
        ],
        prompt: 'You are an experienced educator. Create a comprehensive lesson plan:\n\nSubject: \nGrade Level: \nDuration:  minutes\n\nProvide:\n1. Learning objectives (specific, measurable)\n2. Materials needed\n3. Introduction/hook (5-10 min)\n4. Main instruction activities (step-by-step)\n5. Guided practice\n6. Independent practice\n7. Assessment methods\n8. Differentiation strategies\n9. Closure/summary\n\nAlign with educational best practices.'
      },
      "Quiz Generator": {
        description: "Generate quiz questions on any topic",
        inputs: [
          { name: "topic", label: "Topic/Subject", type: "input" },
          { name: "difficulty", label: "Difficulty Level (easy/medium/hard)", type: "input", value: "medium" },
          { name: "questions", label: "Number of Questions", type: "number", value: "10" }
        ],
        prompt: 'You are an assessment specialist. Create a  quiz on :\n\nDifficulty:  level\nNumber of Questions: \n\nProvide:\n1. Multiple choice questions (with 4 options each)\n2. Correct answers marked\n3. Brief explanations for each answer\n4. Question variety (recall, comprehension, application)\n\nFormat clearly with numbered questions.'
      }
    },
    "Study Materials": {
      "Study Guide": {
        description: "Create a comprehensive study guide for any topic",
        inputs: [
          { name: "topic", label: "Topic/Subject", type: "textarea" },
          { name: "level", label: "Education Level", type: "input" }
        ],
        prompt: 'You are an educational content creator. Create a comprehensive study guide:\n\nTopic: \nLevel: \n\nProvide:\n1. Topic overview\n2. Key concepts and definitions\n3. Important formulas/rules (if applicable)\n4. Step-by-step explanations\n5. Common mistakes to avoid\n6. Practice problems/questions\n7. Memory aids and mnemonics\n8. Additional resources\n\nMake it clear and student-friendly.'
      },
      "Learning Activity": {
        description: "Design an engaging learning activity",
        inputs: [
          { name: "topic", label: "Topic", type: "input" },
          { name: "type", label: "Activity Type (game/project/experiment/discussion)", type: "input" },
          { name: "students", label: "Number of Students", type: "input" }
        ],
        prompt: 'You are an instructional designer. Create an engaging learning activity:\n\nTopic: \nActivity Type: \nStudents: \n\nProvide:\n1. Activity overview and learning goals\n2. Materials needed\n3. Setup instructions\n4. Step-by-step procedures\n5. Time allocation\n6. Assessment rubric\n7. Variations for different learners\n8. Reflection questions\n\nMake it interactive and effective.'
      }
    },
    "Explanations": {
      "ELI5 Explainer": {
        description: "Explain complex topics in simple terms (Explain Like I'm 5)",
        inputs: [
          { name: "concept", label: "Complex Concept/Topic", type: "textarea" }
        ],
        prompt: 'You are an expert at simplifying complex topics. Explain this concept as if explaining to a 5-year-old:\n\n\n\nProvide:\n1. Simple, clear explanation using everyday language\n2. Relatable analogies and examples\n3. Break down into small, digestible parts\n4. No jargon or technical terms\n\nMake it understandable and engaging for young learners.'
      }
    }
  }
  END OF DISABLED CATEGORIES */
};

/**
 * Seed templates into database
 */
async function seedTemplates() {
  try {
    // Initialize database
    initializeDatabase();

    logger.info('Starting template seeding...');

    let count = 0;

    // Iterate through categories
    for (const [category, subcategories] of Object.entries(templateData)) {
      logger.info(`Processing category: ${category}`);

      // Iterate through subcategories
      for (const [subcategory, templates] of Object.entries(subcategories)) {
        logger.info(`Processing subcategory: ${subcategory}`);

        // Iterate through templates
        for (const [templateName, templateInfo] of Object.entries(templates)) {
          const isPremium = templateInfo.premium || false;

          Template.create({
            name: templateName,
            category,
            subcategory,
            description: templateInfo.description,
            prompt_template: templateInfo.prompt,
            inputs: templateInfo.inputs,
            is_premium: isPremium
          });

          count++;
          logger.debug(`Added template: ${templateName}`);
        }
      }
    }

    logger.info(`✓ Successfully seeded ${count} templates!`);
    return count;

  } catch (error) {
    logger.error('Error seeding templates:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates()
    .then(() => {
      console.log('Template seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Template seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTemplates };
