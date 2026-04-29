import { OAS3Definition, OAS3Options } from 'swagger-jsdoc';

const healthPaths: OAS3Definition['paths'] = {
  '/health': {
    servers: [
      {
        url: '/',
        description: 'Root server (health & non-versioned routes)',
      },
    ],
    get: {
      tags: ['Health'],
      summary: 'Service health status',
      description: 'Returns the health status of the API along with database connectivity information.',
      responses: {
        200: {
          description: 'Service is healthy or degraded',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    description: '`ok` when all services are healthy, otherwise `degraded`.',
                    example: 'ok',
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'ISO timestamp when the health check was performed.',
                  },
                  uptime: {
                    type: 'number',
                    description: 'Process uptime in seconds.',
                    example: 123.45,
                  },
                  services: {
                    type: 'object',
                    properties: {
                      database: {
                        type: 'string',
                        enum: ['up', 'down'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        503: {
          description: 'One or more services are unavailable.',
        },
      },
    },
  },
};

const authPaths: OAS3Definition['paths'] = {
  '/auth/register': {
    post: {
      summary: 'Register a new user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password', 'name'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                  minLength: 6,
                },
                name: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: 'User registered successfully',
        },
        400: {
          description: 'Validation error',
        },
        409: {
          description: 'User already exists',
        },
      },
    },
  },
  '/auth/login': {
    post: {
      summary: 'Login user',
      tags: ['Auth'],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                password: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'Login successful',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Invalid credentials',
        },
      },
    },
  },
  '/auth/me': {
    get: {
      summary: 'Get current user profile',
      tags: ['Auth'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      responses: {
        200: {
          description: 'User profile retrieved successfully',
        },
        401: {
          description: 'Unauthorized',
        },
      },
    },
  },
};

const paperPaths: OAS3Definition['paths'] = {
  '/papers': {
    get: {
      summary: 'List papers available to the requester',
      description: 'Admins see every paper; students see only published papers with approved access.',
      tags: ['Papers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 }, description: 'Page number' },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100 },
          description: 'Items per page',
        },
        {
          in: 'query',
          name: 'status',
          schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
          description: 'Filter by status (admin only)',
        },
        { in: 'query', name: 'search', schema: { type: 'string' }, description: 'Search title/description' },
        {
          in: 'query',
          name: 'startDateFrom',
          schema: { type: 'string', format: 'date-time' },
          description: 'Only papers starting at or after this moment',
        },
        {
          in: 'query',
          name: 'startDateTo',
          schema: { type: 'string', format: 'date-time' },
          description: 'Only papers starting at or before this moment',
        },
      ],
      responses: {
        200: { description: 'Paginated list of papers' },
        401: { description: 'Unauthorized' },
      },
    },
    post: {
      summary: 'Create a question paper',
      tags: ['Papers'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title', 'description', 'durationMinutes', 'startDate', 'endDate'],
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                durationMinutes: { type: 'integer', minimum: 1 },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
                earlySubmissionRestrictionMinutes: { type: 'integer', minimum: 0, nullable: true },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Paper created' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
  },
  '/papers/{paperId}': {
    get: {
      summary: 'Get a paper with nested questions',
      tags: ['Papers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'paperId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Paper details' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Paper not found' },
      },
    },
    patch: {
      summary: 'Update paper metadata',
      tags: ['Papers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'paperId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' },
                durationMinutes: { type: 'integer', minimum: 1 },
                startDate: { type: 'string', format: 'date-time' },
                endDate: { type: 'string', format: 'date-time' },
                earlySubmissionRestrictionMinutes: { type: 'integer', minimum: 0, nullable: true },
                status: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Paper updated' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Paper not found' },
      },
    },
  },
  '/papers/{paperId}/questions': {
    post: {
      summary: 'Add questions to a paper',
      tags: ['Papers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'paperId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                required: ['contentHtml', 'marks', 'position', 'subQuestions'],
                properties: {
                  contentHtml: { type: 'string' },
                  marks: { type: 'integer', minimum: 1 },
                  position: { type: 'integer', minimum: 1 },
                  subQuestions: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['label', 'question', 'marks', 'position'],
                      properties: {
                        label: { type: 'string' },
                        question: { type: 'string' },
                        marks: { type: 'integer', minimum: 1 },
                        position: { type: 'integer', minimum: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Paper returned with updated question list' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Paper not found' },
      },
    },
    patch: {
      summary: 'Upsert questions on a paper',
      tags: ['Papers'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'paperId', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  position: { type: 'integer', minimum: 1 },
                  contentHtml: { type: 'string' },
                  marks: { type: 'integer', minimum: 1 },
                  subQuestions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        label: { type: 'string' },
                        question: { type: 'string' },
                        marks: { type: 'integer', minimum: 1 },
                        position: { type: 'integer', minimum: 1 },
                      },
                      anyOf: [
                        { required: ['id'] },
                        { required: ['position', 'label'] },
                      ],
                    },
                  },
                },
                anyOf: [{ required: ['id'] }, { required: ['position'] }],
                description:
                  'If id/position matches an existing question, fields are updated. If no match is found, include position, contentHtml, marks, and at least one sub-question to create a new question. Existing questions or sub-questions not included remain unchanged. Changes are rejected if submissions already exist for the paper.',
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Paper returned with updated question list' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Paper not found' },
      },
    },
  },
};


const userPaths: OAS3Definition['paths'] = {
  '/users': {
    get: {
      summary: 'List users',
      description: 'Returns a paginated list of users. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'query',
          name: 'page',
          schema: {
            type: 'integer',
            minimum: 1,
          },
          description: 'Page number (defaults to 1)',
        },
        {
          in: 'query',
          name: 'limit',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
          },
          description: 'Number of users per page (defaults to 10)',
        },
        {
          in: 'query',
          name: 'role',
          schema: {
            type: 'string',
            enum: ['ADMIN', 'STUDENT'],
          },
          description: 'Filter users by role',
        },
        {
          in: 'query',
          name: 'search',
          schema: {
            type: 'string',
          },
          description: 'Search by email or name (case-insensitive)',
          example: 'john',
        },
      ],
      responses: {
        200: {
          description: 'List of users',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
      },
    },
  },
  '/users/{id}': {
    get: {
      summary: 'Get user by ID',
      description: 'Returns the user details. Users may view their own profile; admins can view any user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        200: {
          description: 'User details',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
    patch: {
      summary: 'Update user profile',
      description: 'Allows users to update their own profile details. Admins can update any user.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                email: {
                  type: 'string',
                  format: 'email',
                },
                name: {
                  type: 'string',
                  nullable: true,
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: 'User updated successfully',
        },
        400: {
          description: 'Validation error',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
        409: {
          description: 'Email conflict',
        },
      },
    },
    delete: {
      summary: 'Delete a user',
      description: 'Deletes a user account. Requires admin privileges.',
      tags: ['Users'],
      security: [
        {
          bearerAuth: [],
        },
      ],
      parameters: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
            format: 'uuid',
          },
        },
      ],
      responses: {
        204: {
          description: 'User deleted successfully',
        },
        400: {
          description: 'Cannot delete the currently authenticated user',
        },
        401: {
          description: 'Unauthorized',
        },
        403: {
          description: 'Forbidden',
        },
        404: {
          description: 'User not found',
        },
      },
    },
  },
};

const accessRequestPaths: OAS3Definition['paths'] = {
  '/access-requests': {
    get: {
      summary: 'List access requests',
      description: 'Admins see all requests; students only see their own.',
      tags: ['Access Requests'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 }, description: 'Page number' },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100 },
          description: 'Items per page',
        },
        {
          in: 'query',
          name: 'status',
          schema: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
          description: 'Filter by status',
        },
        {
          in: 'query',
          name: 'paperId',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by paper',
        },
        {
          in: 'query',
          name: 'studentId',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by student (admin only)',
        },
      ],
      responses: {
        200: { description: 'Paginated access requests' },
        401: { description: 'Unauthorized' },
      },
    },
    post: {
      summary: 'Request access to a paper',
      tags: ['Access Requests'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['paperId'],
              properties: {
                paperId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Access request created' },
        400: { description: 'Invalid paper or existing request' },
        401: { description: 'Unauthorized' },
      },
    },
  },
  '/access-requests/{id}': {
    patch: {
      summary: 'Approve or reject an access request',
      tags: ['Access Requests'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['APPROVED', 'REJECTED'] },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Updated access request' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Request not found' },
      },
    },
  },
};

const submissionPaths: OAS3Definition['paths'] = {
  '/submissions': {
    get: {
      summary: 'List submissions',
      description: 'Admins see all submissions; students only see theirs.',
      tags: ['Submissions'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'query', name: 'page', schema: { type: 'integer', minimum: 1 }, description: 'Page number' },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 100 },
          description: 'Items per page',
        },
        {
          in: 'query',
          name: 'paperId',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by paper',
        },
        {
          in: 'query',
          name: 'studentId',
          schema: { type: 'string', format: 'uuid' },
          description: 'Filter by student (admin only)',
        },
        {
          in: 'query',
          name: 'status',
          schema: { type: 'string', enum: ['SUBMITTED', 'REVIEWED'] },
          description: 'Filter by submission status',
        },
      ],
      responses: {
        200: { description: 'Paginated submissions' },
        401: { description: 'Unauthorized' },
      },
    },
    post: {
      summary: 'Submit answers for a paper',
      tags: ['Submissions'],
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['paperId', 'answers'],
              properties: {
                paperId: { type: 'string', format: 'uuid' },
                answers: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['subQuestionId', 'answerText'],
                    properties: {
                      subQuestionId: { type: 'string', format: 'uuid' },
                      answerText: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        201: { description: 'Submission created' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
      },
    },
  },
  '/submissions/{id}': {
    get: {
      summary: 'Get submission details',
      tags: ['Submissions'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      responses: {
        200: { description: 'Submission details including answers and grades' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Submission not found' },
      },
    },
  },
  '/submissions/{id}/grades': {
    post: {
      summary: 'Grade a submission',
      tags: ['Submissions'],
      security: [{ bearerAuth: [] }],
      parameters: [
        { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['grades'],
              properties: {
                grades: {
                  type: 'array',
                  minItems: 1,
                  items: {
                    type: 'object',
                    required: ['subQuestionId', 'assignedMarks'],
                    properties: {
                      subQuestionId: { type: 'string', format: 'uuid' },
                      assignedMarks: { type: 'integer', minimum: 0 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: 'Submission graded' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Submission not found' },
      },
    },
  },
};

const swaggerDefinition: OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'eAssessment API',
    version: '1.0.0',
    description: 'API documentation for the eAssessment platform',
  },
  servers: [
    {
      url: '/api',
      description: 'Default API',
    },
    {
      url: '/api/v1',
      description: 'Version 1',
    },
    {
      url: '/',
      description: 'Root server (health & non-versioned routes)',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Service health endpoints',
    },
    {
      name: 'Auth',
      description: 'Authentication endpoints',
    },
    {
      name: 'Users',
      description: 'User management endpoints',
    },
    {
      name: 'Papers',
      description: 'Question paper management endpoints',
    },
    {
      name: 'Access Requests',
      description: 'Student access approval workflow',
    },
    {
      name: 'Submissions',
      description: 'Exam submissions and grading endpoints',
    },
  ],
  paths: {
    ...healthPaths,
    ...authPaths,
    ...paperPaths,
    ...accessRequestPaths,
    ...submissionPaths,
    ...userPaths,
  },
};

const swaggerOptions: OAS3Options = {
  definition: swaggerDefinition,
  apis: [],
};

export { swaggerDefinition, swaggerOptions };
