/**
 * Swagger/OpenAPI Configuration
 * Provides interactive API documentation
 */

const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./index');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AI Prompt Templates API',
      version: '1.0.0',
      description: 'Complete API documentation for the AI Prompt Templates application',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:' + config.port,
        description: 'Development server'
      },
      {
        url: '{protocol}://{host}',
        description: 'Custom server',
        variables: {
          protocol: {
            enum: ['http', 'https'],
            default: 'https'
          },
          host: {
            default: 'yourdomain.com',
            description: 'Your production host'
          }
        }
      }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'connect.sid',
          description: 'Session cookie authentication'
        },
        csrfToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-CSRF-Token',
          description: 'CSRF token from cookie'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            username: { type: 'string', example: 'johndoe' },
            email: { type: 'string', format: 'email', example: 'john@example.com' },
            email_verified: { type: 'boolean', example: true },
            is_admin: { type: 'boolean', example: false },
            tokens: { type: 'integer', example: 100 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Blog Post Generator' },
            category: { type: 'string', example: 'Content Creation' },
            subcategory: { type: 'string', example: 'Blogging' },
            description: { type: 'string', example: 'Generate engaging blog posts on any topic' },
            prompt_template: { type: 'string', example: 'Write a blog post about {topic}...' },
            inputs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'topic' },
                  label: { type: 'string', example: 'Blog Topic' },
                  type: { type: 'string', enum: ['text', 'textarea', 'number', 'select'], example: 'text' },
                  placeholder: { type: 'string', example: 'Enter your blog topic' }
                }
              }
            },
            is_premium: { type: 'boolean', example: false },
            is_active: { type: 'boolean', example: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Prompt: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            template_name: { type: 'string', example: 'Blog Post Generator' },
            category: { type: 'string', example: 'Content Creation' },
            prompt_text: { type: 'string', example: 'Write a blog post about AI...' },
            inputs: { type: 'object' },
            project_id: { type: 'integer', nullable: true, example: 1 },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            user_id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'My AI Project' },
            description: { type: 'string', example: 'Collection of AI prompts' },
            color: { type: 'string', example: '#3498db' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Error message' },
            message: { type: 'string', example: 'Detailed error description' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Not authenticated'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Admin access required'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                error: 'Resource not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  error: { type: 'string' },
                  errors: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        message: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and session management'
      },
      {
        name: 'Users',
        description: 'User management (admin only)'
      },
      {
        name: 'Profile',
        description: 'User profile management'
      },
      {
        name: 'Templates',
        description: 'Template browsing and management'
      },
      {
        name: 'Prompts',
        description: 'User prompt management'
      },
      {
        name: 'Projects',
        description: 'Project management'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      },
      {
        name: 'System',
        description: 'System health and monitoring'
      }
    ]
  },
  // Paths to files with OpenAPI annotations
  apis: [
    './src/routes/*.js',
    './src/swagger-docs.js' // Additional documentation file
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
