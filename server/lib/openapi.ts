/**
 * OpenAPI 3.1 document for the public and documented authenticated surface.
 *
 * Every operation has a unique operationId, a description, typed parameters,
 * and response schemas so agents can build function-calling tools from it.
 */

import {
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  RUBRIC_CRITERIA,
  TRACKS,
} from '../../shared/constants'
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, SITE_TITLE } from '../../shared/site'

const errorSchema = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: {
          type: 'string',
          enum: [
            'bad_request',
            'unauthorized',
            'forbidden',
            'not_found',
            'conflict',
            'rate_limited',
            'server_error',
          ],
        },
        message: { type: 'string' },
        fields: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
      },
    },
  },
} as const

export function buildOpenApiDocument() {
  return {
    openapi: '3.1.0',
    info: {
      title: `${SITE_NAME} API`,
      summary: SITE_TITLE,
      description: `${SITE_DESCRIPTION}

Public catalog routes under /api/v1 require no authentication. Applicant and organizer routes use an HTTP-only session cookie from signup or login. See ${SITE_ORIGIN}/auth.md and ${SITE_ORIGIN}/docs.`,
      version: '1.0.0',
      license: { name: 'MIT', identifier: 'MIT' },
      contact: {
        name: `${SITE_NAME} maintainers`,
        url: `${SITE_ORIGIN}/contact`,
      },
    },
    servers: [
      { url: SITE_ORIGIN, description: 'Production' },
      { url: 'http://127.0.0.1:8788', description: 'Local wrangler pages dev' },
    ],
    tags: [
      { name: 'Public', description: 'Keyless catalog and health endpoints' },
      { name: 'Auth', description: 'Session signup, login, and current user' },
      { name: 'Applications', description: 'Applicant application lifecycle' },
      { name: 'Admin', description: 'Organizer review and decisions' },
    ],
    paths: {
      '/api/health': {
        get: {
          operationId: 'getHealth',
          tags: ['Public'],
          summary: 'Health check',
          description:
            'Returns whether the API process is up. Works on preview deployments without a database.',
          responses: {
            '200': {
              description: 'Service is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['ok', 'service'],
                    properties: {
                      ok: { type: 'boolean', const: true },
                      service: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1': {
        get: {
          operationId: 'getApiRoot',
          tags: ['Public'],
          summary: 'API root descriptor',
          description:
            'Lists the public catalog endpoints, documentation URLs, MCP endpoint, and CLI package name for agent discovery.',
          responses: {
            '200': {
              description: 'API descriptor',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApiRoot' },
                },
              },
            },
          },
        },
      },
      '/api/v1/meta': {
        get: {
          operationId: 'getProductMeta',
          tags: ['Public'],
          summary: 'Product metadata',
          description:
            'Returns the product name, tagline, description, and links agents should use next (docs, OpenAPI, MCP, CLI).',
          responses: {
            '200': {
              description: 'Product metadata',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ProductMeta' },
                },
              },
            },
          },
        },
      },
      '/api/v1/application-types': {
        get: {
          operationId: 'listApplicationTypes',
          tags: ['Public'],
          summary: 'List application types',
          description:
            'Returns the supported application tracks (hacker, judge) with short descriptions.',
          responses: {
            '200': {
              description: 'Application types',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/ApplicationTypesResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/statuses': {
        get: {
          operationId: 'listApplicationStatuses',
          tags: ['Public'],
          summary: 'List application statuses',
          description: 'Returns every status value an application can hold in the portal.',
          responses: {
            '200': {
              description: 'Status vocabulary',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/StatusesResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/tracks': {
        get: {
          operationId: 'listTracks',
          tags: ['Public'],
          summary: 'List hacker tracks',
          description: 'Returns the hacker interest tracks offered on the application form.',
          responses: {
            '200': {
              description: 'Tracks',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/TracksResponse' },
                },
              },
            },
          },
        },
      },
      '/api/v1/rubric': {
        get: {
          operationId: 'getRubric',
          tags: ['Public'],
          summary: 'Get review rubric',
          description:
            'Returns the shared organizer rubric criteria, score range, and human-facing help text.',
          responses: {
            '200': {
              description: 'Rubric',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/RubricResponse' },
                },
              },
            },
          },
        },
      },
      '/openapi.json': {
        get: {
          operationId: 'getOpenApiDocument',
          tags: ['Public'],
          summary: 'OpenAPI document',
          description: 'Returns this OpenAPI 3.1 specification as JSON.',
          responses: {
            '200': {
              description: 'OpenAPI 3.1 document',
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
      '/api/openapi.json': {
        get: {
          operationId: 'getOpenApiDocumentAlias',
          tags: ['Public'],
          summary: 'OpenAPI document (API alias)',
          description: 'Same document as /openapi.json, served under the /api prefix.',
          responses: {
            '200': {
              description: 'OpenAPI 3.1 document',
              content: {
                'application/json': {
                  schema: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
      },
      '/api/auth/signup': {
        post: {
          operationId: 'signUp',
          tags: ['Auth'],
          summary: 'Create an applicant account',
          description:
            'Creates an applicant account and sets a session cookie. Organizer role cannot be self-assigned.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SignupRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signed up',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SessionResponse' },
                },
              },
            },
            '400': {
              description: 'Validation failed',
              content: { 'application/json': { schema: errorSchema } },
            },
            '409': {
              description: 'Email already registered',
              content: { 'application/json': { schema: errorSchema } },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          operationId: 'logIn',
          tags: ['Auth'],
          summary: 'Sign in with email and password',
          description: 'Creates a session cookie for an existing account.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Signed in',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/SessionResponse' },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: { 'application/json': { schema: errorSchema } },
            },
          },
        },
      },
      '/api/auth/me': {
        get: {
          operationId: 'getCurrentUser',
          tags: ['Auth'],
          summary: 'Current session user',
          description: 'Returns the signed-in user, or null when anonymous.',
          security: [{ sessionCookie: [] }],
          responses: {
            '200': {
              description: 'Current user envelope',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['user'],
                    properties: {
                      user: {
                        oneOf: [{ $ref: '#/components/schemas/SessionUser' }, { type: 'null' }],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/logout': {
        post: {
          operationId: 'logOut',
          tags: ['Auth'],
          summary: 'End the current session',
          description: 'Clears the session cookie and deletes the server-side session row.',
          security: [{ sessionCookie: [] }],
          responses: {
            '200': {
              description: 'Signed out',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: { ok: { type: 'boolean' } },
                  },
                },
              },
            },
          },
        },
      },
      '/api/applications': {
        get: {
          operationId: 'listMyApplications',
          tags: ['Applications'],
          summary: 'List applications for the signed-in applicant',
          description: 'Returns every application owned by the current user.',
          security: [{ sessionCookie: [] }],
          responses: {
            '200': {
              description: 'Application list',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['applications'],
                    properties: {
                      applications: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ApplicationSummary' },
                      },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Not signed in',
              content: { 'application/json': { schema: errorSchema } },
            },
          },
        },
        post: {
          operationId: 'createApplication',
          tags: ['Applications'],
          summary: 'Start an application',
          description:
            'Creates a draft application of the given type for the current user. Starting the same type twice returns the existing row.',
          security: [{ sessionCookie: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['type'],
                  properties: {
                    type: { type: 'string', enum: [...APPLICATION_TYPES] },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Created or existing draft',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['application'],
                    properties: {
                      application: { $ref: '#/components/schemas/ApplicationSummary' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Not signed in',
              content: { 'application/json': { schema: errorSchema } },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        sessionCookie: {
          type: 'apiKey',
          in: 'cookie',
          name: 'nch_session',
          description:
            'HTTP-only session cookie issued by signup or login. See /auth.md for agent walkthrough.',
        },
      },
      schemas: {
        ApiRoot: {
          type: 'object',
          required: ['name', 'version', 'documentation', 'endpoints'],
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            documentation: { type: 'string', format: 'uri' },
            openapi: { type: 'string', format: 'uri' },
            mcp: { type: 'string', format: 'uri' },
            cli: { type: 'string' },
            endpoints: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
        ProductMeta: {
          type: 'object',
          required: ['name', 'title', 'description', 'origin'],
          properties: {
            name: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            origin: { type: 'string', format: 'uri' },
            applicationTypes: {
              type: 'array',
              items: { type: 'string', enum: [...APPLICATION_TYPES] },
            },
            statuses: {
              type: 'array',
              items: { type: 'string', enum: [...APPLICATION_STATUSES] },
            },
            tracks: {
              type: 'array',
              items: { type: 'string', enum: [...TRACKS] },
            },
            links: {
              type: 'object',
              additionalProperties: { type: 'string', format: 'uri' },
            },
          },
        },
        ApplicationTypesResponse: {
          type: 'object',
          required: ['types'],
          properties: {
            types: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'label', 'description'],
                properties: {
                  id: { type: 'string', enum: [...APPLICATION_TYPES] },
                  label: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
        StatusesResponse: {
          type: 'object',
          required: ['statuses'],
          properties: {
            statuses: {
              type: 'array',
              items: { type: 'string', enum: [...APPLICATION_STATUSES] },
            },
          },
        },
        TracksResponse: {
          type: 'object',
          required: ['tracks'],
          properties: {
            tracks: {
              type: 'array',
              items: { type: 'string', enum: [...TRACKS] },
            },
          },
        },
        RubricResponse: {
          type: 'object',
          required: ['criteria', 'scoreMin', 'scoreMax'],
          properties: {
            scoreMin: { type: 'integer' },
            scoreMax: { type: 'integer' },
            criteria: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'label', 'help'],
                properties: {
                  id: { type: 'string', enum: [...RUBRIC_CRITERIA] },
                  label: { type: 'string' },
                  help: { type: 'string' },
                },
              },
            },
          },
        },
        SignupRequest: {
          type: 'object',
          required: ['email', 'password', 'fullName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            fullName: { type: 'string', minLength: 1 },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
        SessionUser: {
          type: 'object',
          required: ['id', 'email', 'fullName', 'role'],
          properties: {
            id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            fullName: { type: 'string' },
            role: { type: 'string', enum: ['applicant', 'organizer'] },
          },
        },
        SessionResponse: {
          type: 'object',
          required: ['user'],
          properties: {
            user: { $ref: '#/components/schemas/SessionUser' },
          },
        },
        ApplicationSummary: {
          type: 'object',
          required: ['id', 'type', 'status', 'answers', 'createdAt', 'updatedAt'],
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: [...APPLICATION_TYPES] },
            status: { type: 'string', enum: [...APPLICATION_STATUSES] },
            answers: { type: 'object', additionalProperties: true },
            submittedAt: { type: ['integer', 'null'] },
            createdAt: { type: 'integer' },
            updatedAt: { type: 'integer' },
          },
        },
        ApiError: errorSchema,
      },
    },
  }
}
