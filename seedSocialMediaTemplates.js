/**
 * Seed Social Media Templates
 * Adds all 41 Social Media templates to the database
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || 'prompts.db';
const db = new Database(DB_PATH);

console.log(`Using database: ${DB_PATH}`);
console.log('Starting Social Media templates seeding...\n');

// Social Media Templates Data
const socialMediaTemplates = [
  // ============ FACEBOOK (4 templates) ============
  {
    category: 'Social Media',
    subcategory: 'Facebook',
    name: 'Facebook Post Ideas',
    description: 'Generate ideas for Facebook posts on your topic of choice that will engage your target audience',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an expert Facebook marketer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate {{total_posts}} ideas for Facebook posts on the topic "{{topic}}" that will engage the target audience "{{audience}}". Include a CTA and hashtags wherever possible.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter your topic', required: true },
      { name: 'total_posts', type: 'number', label: 'Total Posts', placeholder: '5', required: true, default: '5' },
      { name: 'audience', type: 'text', label: 'Audience', placeholder: 'Enter target audience', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Facebook',
    name: 'Facebook Group Post',
    description: 'Generate ideas for Facebook Group posts for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an expert Facebook marketer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Give me a list of {{total_posts}} interesting and engaging questions to post on my Facebook Group about "{{topic}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter your topic', required: true },
      { name: 'total_posts', type: 'number', label: 'Total Posts', placeholder: '5', required: true, default: '5' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Facebook',
    name: 'Facebook Ad Creator',
    description: 'Create a complete Facebook ad for your product or service',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an expert Facebook Ads copywriter with expertise in Facebook Ads. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please create ad copy for the product/service "{{topic}}". Please use the following guidelines: Create a compelling headline that grabs attention and highlights the main benefit of the product/service. The headline should be between 30-40 characters and its description field should be 20-25 characters. Then, create the primary ad text field. Use clear and concise language in the primary ad text field copy that focuses on the benefits of the product/service and addresses any potential objections. Include a strong call to action that encourages users to take the desired action. The primary ad text field should be 120-125 characters. Research the target audience demographics, such as age, gender, location, interests, and other characteristics that would help you to have a better understanding of the target audience. Create an ad that would be more appealing to them.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter product/service', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Facebook',
    name: 'Facebook Post Calendar',
    description: 'Generate a Facebook content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an expert Facebook marketer. You have a Creative tone of voice. You have a Argumentative writing style. Please create a Facebook Post Calendar for {{total_months}} months based on your product/service "{{topics}}". There should be {{threads_per_week}} Facebook posts scheduled each week of the month. Every Facebook post should have a catchy headline and description. Try to use unique emojis in the description. The description should have a hook and entice the readers. The table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Post Title, Post Idea, Hashtags. Please organize each Facebook post in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topics', type: 'textarea', label: 'Topics', placeholder: 'Enter topics for content', required: true },
      { name: 'threads_per_week', type: 'number', label: 'Threads per week', placeholder: '5', required: true, default: '5' },
      { name: 'total_months', type: 'number', label: 'Total months', placeholder: '3', required: true, default: '3' }
    ])
  },

  // ============ INSTAGRAM (6 templates) ============
  {
    category: 'Social Media',
    subcategory: 'Instagram',
    name: 'Generate Instagram Carousel',
    description: 'Create a complete carousel for Instagram with caption',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an Instagrammer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Create an Instagram carousel post on "{{topic}}". There should be around 8 to 10 slides. Write down details on all the slides with titles. Generate an exact content example for each slide. After writing the carousel slides, please add a separating line and then generate an Instagram post description in just a few sentences for the carousel. Include emojis and the Instagram hashtags in the description. Try to use unique emojis in the content. The description should have a hook and entice readers. Do not repeat yourself. Do not self reference. Do not explain what you are doing. Do not explain what you are going to do. Start directly by writing down the slide details.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'textarea', label: 'Topic', placeholder: 'Enter carousel topic', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Instagram',
    name: 'Generate Instagram Caption',
    description: 'Create a Instagram description/caption',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an Instagrammer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Write a Instagram post description in just a few sentences for the post "{{topic}}". Make the description readable by formatting with new lines. Include emojis and the Instagram hashtags in the description. Try to use unique emojis in the description. The description should have a hook and entice readers. Do not repeat yourself. Do not self reference. Do not explain what you are doing. Do not explain what you are going to do. Start directly by writing down the description.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'textarea', label: 'Topic', placeholder: 'Enter post topic', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Instagram',
    name: 'Instagram Post Calendar',
    description: 'Generates an Instagram content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an Instagrammer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Please create an Instagram Calendar for {{total_months}} months based on your interests "{{topic}}". There should be {{articles_per_week}} Instagram posts scheduled each week of the month. Every Instagram post should have a catchy description. Include emojis and the Instagram hashtags in the description. Try to use unique emojis in the description. The description should have a hook and entice the readers. The table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Post Idea, description, caption without hashtags, hashtags. Please organize each Instagram post in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'articles_per_week', type: 'number', label: 'Articles per week', placeholder: '3', required: true, default: '3' },
      { name: 'total_months', type: 'number', label: 'Total months', placeholder: '3', required: true, default: '3' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Instagram',
    name: 'Instagram Hashtag Generator',
    description: 'Generate popular Instagram hashtags for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an Instagram influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total}} high performing Instagram hashtags for the following text: "{{instagram_post}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'instagram_post', type: 'textarea', label: 'Instagram Post', placeholder: 'Enter Instagram post text', required: true },
      { name: 'total', type: 'number', label: 'Total', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Instagram',
    name: 'Respond To Instagram Comments',
    description: 'Generate customer support responses for Instagram comments',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a customer support agent who responds to Instagram comments with empathy. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please create a response for a customer Instagram comment. Please use relevant emojis.The customer comment is "{{instagram_comment}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'instagram_comment', type: 'textarea', label: 'Instagram Comment', placeholder: 'Enter customer comment', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Instagram',
    name: 'Instagram Reels Script Writer',
    description: 'Write an engaging Instagram Reels video script for your topic and target audience of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an Instagram marketer and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please write me a Instagram Reels video script for the topic "{{topic}}". The target audience is "{{audience}}". The length of the video should be less than 90 seconds long. The script needs to have a catchy title, follow the best practices of Instagram Reels, and get as much traction from the target audience as possible. Please include relevant hashtags to be used.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'audience', type: 'text', label: 'Audience', placeholder: 'Enter target audience', required: true }
    ])
  },

  // ============ LINKEDIN (7 templates) ============
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Post Creator',
    description: 'Create engaging content post for LinkedIn',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a LinkedIn content creator. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Your content should be engaging, informative, and relevant to LinkedIn posts for working professionals across different industries. Please include industry insights, personal experiences, and thought leadership while maintaining a genuine and conversational tone. Please create a post about "{{topic}}" for the industry "{{industry}}". Add emojis to the content when appropriate and write from a personal experience. The content should be between 390 - 400 words long and spaced out that it's easy for readers to scan through. Please add relevant hashtags to the post and encourage the readers to comment.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'industry', type: 'text', label: 'Industry', placeholder: 'Enter industry', required: true },
      { name: 'post_length', type: 'text', label: 'Post Length', placeholder: '390 - 400 words', required: true, default: '390 - 400 words' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Comment Generator',
    description: 'Create a reply to a LinkedIn post',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a LinkedIn influencer with a large following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please create 3 appreciative comments in response to the following LinkedIn Post: "{{post}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'post', type: 'textarea', label: 'Post', placeholder: 'Enter LinkedIn post', required: true },
      { name: 'length', type: 'number', label: 'Length', placeholder: '3', required: true, default: '3' },
      { name: 'comment_type', type: 'text', label: 'Comment Type', placeholder: 'appreciative', required: true, default: 'appreciative' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Bio Generator',
    description: 'Generate a personalized LinkedIn bio',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an expert LinkedIn Bio creator. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Create a LinkedIn Bio for the following job description "{{job_description}}". The bio should be 300 characters long and should highlight the top 5 skills of the job mentioned.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'job_description', type: 'textarea', label: 'Job Description', placeholder: 'Enter job description', required: true },
      { name: 'length', type: 'number', label: 'Length', placeholder: '300', required: true, default: '300' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Connection Message',
    description: 'Create a personalized LinkedIn connection message',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a LinkedIn user who would like to connect with a LinkedIn user with the name "{{name}}". They have the position of "{{title_company}}". The message should be between 290 to 300 characters. Please make the message friendly and engaging. Do not directly mention their position.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'name', type: 'text', label: 'Name', placeholder: 'Enter name', required: true },
      { name: 'title_company', type: 'text', label: 'Title & Company', placeholder: 'Enter title and company', required: true },
      { name: 'length', type: 'text', label: 'Length', placeholder: '290 to 300 characters', required: true, default: '290 to 300 characters' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Ad Generator',
    description: 'Generate an engaging ad for LinkedIn',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a sales manager with expertise in LinkedIn Ads creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate 10 compelling LinkedIn ad headlines about the topics "{{topic}}". The headlines should be between 140 to 150 characters long. After this, generate 10 compelling LinkedIn ad descriptions about the topics "{{topic}}". The descriptions should be between 60 to 70 characters long. Do not use single quotes, double quotes or any other enclosing characters.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'length', type: 'number', label: 'Length', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Hashtag Generator',
    description: 'Generate popular Linkedin hashtags',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a LinkedIn influencer with a large following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total}} high performing hashtags for the following LinkedIn Post: "{{post}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'post', type: 'textarea', label: 'Post', placeholder: 'Enter LinkedIn post', required: true },
      { name: 'total', type: 'number', label: 'Total', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'LinkedIn',
    name: 'LinkedIn Post Calendar',
    description: 'Generates a LinkedIn content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an LinkedIn professional with a large following. You have a Creative tone of voice. You have a Argumentative writing style. Please create a LinkedIn Post Calendar for {{total_months}} months based on your interests "{{topic}}". There should be {{posts_per_week}} LinkedIn posts scheduled each week of the month. The Posts should be engaging, informative, and relevant to various LinkedIn professionals across different industries. Please include posts that include industry insights, personal experiences, and thought leadership while maintaining a genuine and conversational tone. Please use simple and understandable words. Please include tips, personal experience, and fun facts in the Posts. The markdown table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, LinkedIn Post Idea, Hashtags. Please organize each LinkedIn post in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'posts_per_week', type: 'number', label: 'Posts per week', placeholder: '3', required: true, default: '3' },
      { name: 'total_months', type: 'number', label: 'Total months', placeholder: '3', required: true, default: '3' }
    ])
  },

  // ============ PINTEREST (5 templates) ============
  {
    category: 'Social Media',
    subcategory: 'Pinterest',
    name: 'Keywords For Pinterest',
    description: 'Generate SEO optimized keywords for your Pinterest posts',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Pinterest marketing expert. Do not self reference. Do not explain what you are doing. Please provide me with {{total_keywords}} high performing SEO keywords to use for Pinterest for the following topic: "{{topic}}"`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'total_keywords', type: 'number', label: 'Total Keywords', placeholder: '50', required: true, default: '50' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Pinterest',
    name: 'Generate Pin Titles',
    description: 'Generate Pinterest pin titles options for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Pinterest SEO marketer and copywriter. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please provide me with {{total_titles}} engaging Pinterest pin titles for the topic "{{topic}}". The titles should be between 90 to 100 characters.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'total_titles', type: 'number', label: 'Total Titles', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Pinterest',
    name: 'Generate Pin Descriptions',
    description: 'Create Pinterest pin descriptions for your post topic',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. Do not self reference. You are a Pinterest SEO marketer and copywriter. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please write {{total_desc}} Pinterest description that is between 400 to 500 Characters for the following topic: "{{topic}}". Please include the following keywords "{{keywords}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'total_desc', type: 'number', label: 'Total Desc', placeholder: '3', required: true, default: '3' },
      { name: 'keywords', type: 'textarea', label: 'Keywords', placeholder: 'Enter keywords', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Pinterest',
    name: 'Pinterest Hashtag Generator',
    description: 'Generate popular Pinterest hashtags for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Pinterest marketer and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total_hashtags}} popular hashtags for the following text: "{{content_topic}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'content_topic', type: 'textarea', label: 'Content/Topic', placeholder: 'Enter content or topic', required: true },
      { name: 'total_hashtags', type: 'number', label: 'Total Hashtags', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Pinterest',
    name: 'Pinterest Pin Calendar',
    description: 'Generates a Pinterest content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Pinterest marketer and influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Please create a Pinterest Pin Calendar with ideas for engaging pins for {{total_months}} months based on the topic "{{topics}}". There should be {{threads_per_week}} Pins scheduled each week of the month. Every Pinterest post should be casual, informative, and engaging. Please use simple and understandable words. Please include tips, personal experience, and fun facts in the Pins. The markdown table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Pinterest Pin Idea, Hashtags. Please organize each Pinterest Pin in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topics', type: 'text', label: 'Topics', placeholder: 'Enter topics', required: true },
      { name: 'threads_per_week', type: 'number', label: 'Threads per week', placeholder: '5', required: true, default: '5' },
      { name: 'total_months', type: 'number', label: 'Total months', placeholder: '3', required: true, default: '3' }
    ])
  },

  // ============ TIKTOK (4 templates) ============
  {
    category: 'Social Media',
    subcategory: 'TikTok',
    name: 'TikTok Video Ideas',
    description: 'Generate catchy video ideas for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a TikTok marketer and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total_ideas}} TikTok video ideas that have the potential to go viral for the topic "{{topic}}". Please include catchy titles and trending hashtags for each idea.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'total_ideas', type: 'number', label: 'Total Ideas', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'TikTok',
    name: 'TikTok Script Writer',
    description: 'Write an engaging TikTok video script for your topic and target audience of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a TikTok marketer and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please write me a TikTok video script for the topic "{{topic}}". The target audience is "{{audience}}". The length of the video should be less than 90 seconds long. The script needs to have a catchy title, follow the best practice of TikTok videos, and get as much traction from the target audience as possible.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true },
      { name: 'audience', type: 'text', label: 'Audience', placeholder: 'Enter target audience', required: true },
      { name: 'length', type: 'text', label: 'Length', placeholder: '90 seconds', required: true, default: '90 seconds' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'TikTok',
    name: 'TikTok Hashtag Generator',
    description: 'Generate trending TikTok hashtags for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a TikTok influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total_hashtags}} trending hashtags for the following text: "{{content_topic}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'content_topic', type: 'textarea', label: 'Content/Topic', placeholder: 'Enter content or topic', required: true },
      { name: 'total_hashtags', type: 'number', label: 'Total Hashtags', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'TikTok',
    name: 'TikTok Post Calendar',
    description: 'Generate a TikTok content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a TikTok creator and influencer. You have a Creative tone of voice. You have a Argumentative writing style. Please create a TikTok content Calendar with ideas for engaging TikTok for {{total_months}} months based on the topic "{{topics}}". There should be {{threads_per_week}} videos scheduled each week of the month. The videos should be entertaining, informative, and engaging. Please use simple and understandable words. Please include tips, personal experience, and fun facts in the videos. The markdown table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, TikTok idea, Hashtags, Trending Songs. Please organize each TikTok idea in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topics', type: 'text', label: 'Topics', placeholder: 'Enter topics', required: true },
      { name: 'threads_per_week', type: 'number', label: 'Threads per week', placeholder: '5', required: true, default: '5' },
      { name: 'total_months', type: 'number', label: 'Total months', placeholder: '3', required: true, default: '3' }
    ])
  },

  // ============ TWITTER (7 templates) ============
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Engaging Twitter Thread',
    description: 'Create an engaging Twitter thread',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Twitter influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please create a thread about "{{topic}}". Add emojis to the thread when appropriate. The character limit for each tweet should be between 270 to 280 characters. Your content should be casual, informative, and an engaging Twitter thread. Please use simple and understandable words. Please include statistics, personal experience, and fun facts in the thread. Please add relevant hashtags to the post and encourage the Twitter users to join the conversation.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topic', type: 'text', label: 'Topic', placeholder: 'Enter topic', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Twitter Personalized Bio',
    description: 'Create a unique Twitter bio for your job role and industry',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a professional Twitter Bio generator. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please create a unique and eye-catching Twitter bio with suitable emojis and informative bio for "{{job_role}}" in the industry "{{industry}}" who wants to showcase their skills and experience on their Twitter profile. The bio should be brief engaging and highlight the individual's professional accomplishments and unique selling points in a concise and attention-grabbing manner. The length of the bio should be between 150 to 160 characters. Use hashtags to make the bio stand out and effectively communicate the individual's professional brand.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'job_role', type: 'text', label: 'Job Role', placeholder: 'Enter job role', required: true },
      { name: 'industry', type: 'text', label: 'Industry', placeholder: 'Enter industry', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Convert Article to Twitter Thread (Paste Content)',
    description: 'Convert your article into an engaging Twitter thread with hashtags',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a professional copywriter and would like to convert your article into an engaging Twitter thread. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Add emojis to the thread when appropriate. The character count for each thread should be between 270 to 280 characters. Please turn the following article into a Twitter thread: "{{article}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'article', type: 'textarea', label: 'Article', placeholder: 'Paste article content', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Convert Article to Twitter Thread (Paste URL)',
    description: 'Convert your article into an engaging Twitter thread with hashtags',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a professional copywriter and would like to convert your article into an engaging Twitter thread. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Add emojis to the thread when appropriate. The character count for each thread should be between 270 to 280 characters. Please turn the following article into a Twitter thread: "{{input_1.content}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'webpage_url', type: 'text', label: 'Webpage URL', placeholder: 'Enter URL', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Respond to Customers on Twitter',
    description: 'Generate tweet responses for the most common customer complaints',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a customer support agent who responds to customer tweets with empathy. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please create a response for a customer tweet. Break your response into individual tweets. The character count for each tweet should be between 270 to 280 characters. The customer tweet is "{{customer_tweet}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'customer_tweet', type: 'textarea', label: 'Customer Tweet', placeholder: 'Enter customer tweet', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Twitter Hashtag Generator',
    description: 'Generate popular Twitter hashtags for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Twitter influencer with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total_hashtags}} high performing hashtags for the following text: "{{content}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'content', type: 'textarea', label: 'Content', placeholder: 'Enter content', required: true },
      { name: 'total_hashtags', type: 'number', label: 'Total Hashtags', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'Twitter',
    name: 'Twitter Thread Calendar',
    description: 'Generates a Twitter content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a Twitter professional with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Please create a Twitter thread Calendar for {{total_months}} months based on the topic "{{topics}}". There should be {{threads_per_week}} Twitter threads scheduled each week of the month. The twitter threads should be casual, informative, and engaging. Please use simple and understandable words. Please include statistics, personal experience, and fun facts in the twitter threads. The markdown table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Twitter Thread Idea, Hashtags. Please organize each blog post in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topics', type: 'text', label: 'Topics', placeholder: 'Enter topics', required: true },
      { name: 'threads_per_week', type: 'number', label: 'Threads per week', placeholder: '5', required: true, default: '5' },
      { name: 'total_months', type: 'number', label: 'Total months', placeholder: '3', required: true, default: '3' }
    ])
  },

  // ============ YOUTUBE (8 templates) ============
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Script Creator',
    description: 'Create a complete script for YouTube',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a YouTuber with a large fan following. You are an expert in YouTube SEO and can write compelling YouTube titles and descriptions. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Create a complete youtube video script for "{{video_description}}". The script should have a good introduction, between 4 to 5 segments and an conclusion. In the relevant segment ask the viewer to click the subscribe button "{{call_to_action}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'video_description', type: 'textarea', label: 'Video Description', placeholder: 'Enter video description', required: true },
      { name: 'call_to_action', type: 'text', label: 'Call to Action', placeholder: 'to click the subscribe button', required: true, default: 'to click the subscribe button' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Shorts Script',
    description: 'Create a 60 second script for YouTube Shorts',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a YouTuber with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Create a Youtube Shorts video script for "{{video_description}}". The script is for YouTube Shorts and should not be longer than 60 seconds. In the script where relevant, ask the viewer to click the subscribe button "{{call_to_action}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'video_description', type: 'textarea', label: 'Video Description', placeholder: 'Enter video description', required: true },
      { name: 'call_to_action', type: 'text', label: 'Call to Action', placeholder: 'to click the subscribe button', required: true, default: 'to click the subscribe button' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Title & Descriptions',
    description: 'Generate YouTube video titles and descriptions from keywords',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a YouTuber with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate catchy YouTube titles and descriptions for a list of keywords "{{keywords}}". Only one title and one description should be generated for each keyword. The title should not be more than 100 characters long. The description should be more informative. The titles should be good for videos and help generate titles. The titles should be generic by visual way. The description should be long and contain multiple informational paragraphs about the topic. The description should also ask the viewer to click the subscribe button.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'keywords', type: 'textarea', label: 'Keywords', placeholder: 'Enter keywords', required: true },
      { name: 'call_to_action', type: 'text', label: 'Call to Action', placeholder: 'to click the subscribe button', required: true, default: 'to click the subscribe button' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Transcript to Article',
    description: 'Generate YouTube video titles and descriptions from keywords',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are an expert copywriter who is good at converting YouTube transcripts into articles. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. I will give you a YouTube transcript text and you will create an article based on it. Please intersperse short and long sentences. Utilize uncommon terminology to enhance the originality of the content. Please format the content in a professional format. Also generate a catchy page title and meta descriptions for the article. The page title should be between 70 and 80 Characters. The meta descriptions should be between 140 and 160 characters and should be optimized for the keyword "{{keyword}}". The meta descriptions should NOT have enclosing characters. The Youtube transcript text is "{{transcript}}"`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'transcript', type: 'textarea', label: 'Transcript', placeholder: 'Enter YouTube transcript', required: true },
      { name: 'keyword', type: 'text', label: 'Keyword', placeholder: 'Enter keyword', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Ads Generator (Paste Description)',
    description: 'Generate headlines and descriptions for running Ads on YouTube',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a copywriter with expertise in YouTube Ads creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate 10 compelling YouTube headlines and 10 compelling descriptions for a video. The headlines should be between 90 to 100 characters long. The descriptions should be between 30 to 35 characters long. Do not use single quotes, double quotes or any other enclosing characters. The video is about "{{video_description}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'total_headlines', type: 'number', label: 'Total Headlines', placeholder: '10', required: true, default: '10' },
      { name: 'headlines_length', type: 'text', label: 'Headlines Length', placeholder: '90 to 100 characters', required: true, default: '90 to 100 characters' },
      { name: 'description_length', type: 'text', label: 'Description Length', placeholder: '30 to 35 characters', required: true, default: '30 to 35 characters' },
      { name: 'video_description', type: 'textarea', label: 'Video Description', placeholder: 'Enter video description', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Ads Generator (Paste URL)',
    description: 'Generate headlines and descriptions for running Ads on YouTube',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a copywriter with expertise in YouTube Ad creation. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Generate 10 compelling YouTube headlines and 10 compelling descriptions for a video. The headlines should be between 90 to 100 characters long. The descriptions should be between 30 to 35 characters long. Do not use single quotes, double quotes or any other enclosing characters. The video is about "{{input_4.title}} {{input_4.description}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'total_headlines', type: 'number', label: 'Total Headlines', placeholder: '10', required: true, default: '10' },
      { name: 'headlines_length', type: 'text', label: 'Headlines Length', placeholder: '90 to 100 characters', required: true, default: '90 to 100 characters' },
      { name: 'description_length', type: 'text', label: 'Description Length', placeholder: '30 to 35 characters', required: true, default: '30 to 35 characters' },
      { name: 'youtube_video_url', type: 'text', label: 'YouTube Video URL', placeholder: 'Enter YouTube URL', required: true }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Tags Generator',
    description: 'Generate trending TikTok hashtags for your topic of choice',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a YouTuber with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Do not self reference. Do not explain what you are doing. Please generate {{total_tags}} comma separated keyword with spaces between the words. Please capitalize each word in the YouTube tag. Please do not generate hashtags. If you generate anything that starts with the "#" character then remove it. YouTube tags are comma separated keywords that describe what the text I give you. Please do not put the YouTube tags in a markdown table. Please generate the YouTube tags for the text: "{{video_description_transcript}}".`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'video_description_transcript', type: 'textarea', label: 'Video Description/Transcript', placeholder: 'Enter video description or transcript', required: true },
      { name: 'total_tags', type: 'number', label: 'Total Tags', placeholder: '10', required: true, default: '10' }
    ])
  },
  {
    category: 'Social Media',
    subcategory: 'YouTube',
    name: 'YouTube Video Calendar',
    description: 'Generates a YouTube content calendar for the next three months',
    prompt_template: `Please ignore all previous instructions. Please respond only in the english language. You are a YouTuber with a large fan following. You have a Creative tone of voice. You have a Argumentative writing style. Please create a YouTube Video Calendar for {{total_months}} months based on your interests "{{topics}}". There should be {{videos_per_week}} videos scheduled each week of the month. The markdown table should have actual dates in the future. Each month should have its own table. The table columns should be: Date, Video Title, Video Description. The Video title should be no longer than 100 characters. The Video description should describe what the video is about. Please organize each video in the table so that it looks like a calendar. Do not self reference. Do not explain what you are doing. Reply back only with the table.`,
    is_active: 1,
    inputs: JSON.stringify([
      { name: 'topics', type: 'text', label: 'Topics', placeholder: 'Enter topics', required: true },
      { name: 'videos_per_week', type: 'number', label: 'Videos per week', placeholder: '1', required: true, default: '1' },
      { name: 'total_months', type: 'number', label: 'Total Months', placeholder: '3', required: true, default: '3' }
    ])
  }
];

// Insert templates into database
console.log('Inserting templates into database...\n');

const stmt = db.prepare(`
  INSERT INTO templates (category, subcategory, name, description, prompt_template, is_active, inputs)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let successCount = 0;
let errorCount = 0;

for (const template of socialMediaTemplates) {
  try {
    stmt.run(
      template.category,
      template.subcategory,
      template.name,
      template.description,
      template.prompt_template,
      template.is_active,
      template.inputs
    );
    console.log(`✓ Added: ${template.subcategory} - ${template.name}`);
    successCount++;
  } catch (error) {
    console.error(`✗ Failed: ${template.subcategory} - ${template.name}`);
    console.error(`  Error: ${error.message}`);
    errorCount++;
  }
}

db.close();

console.log('\n' + '='.repeat(60));
console.log('Summary:');
console.log(`✓ Successfully added: ${successCount} templates`);
console.log(`✗ Failed: ${errorCount} templates`);
console.log('='.repeat(60));

console.log('\nSocial Media templates have been seeded successfully!');
console.log('\nBreakdown by subcategory:');
console.log('  - Facebook: 4 templates');
console.log('  - Instagram: 6 templates');
console.log('  - LinkedIn: 7 templates');
console.log('  - Pinterest: 5 templates');
console.log('  - TikTok: 4 templates');
console.log('  - Twitter: 7 templates');
console.log('  - YouTube: 8 templates');
console.log('  TOTAL: 41 templates\n');
