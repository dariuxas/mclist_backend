'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const {
  createApiResponse
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const {
  updateServerResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
  const serverController = fastify.getService('serverController');

  // POST /:id/generate-seo - admin only
  fastify.post('/:id(\\d+)/generate-seo', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Generate SEO data for server',
      description: 'Generate SEO data for an existing server (admin only)',
      response: {
        200: createApiResponse({ type: 'object' }),
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate, requireRole('admin')],
    handler: async (request, reply) => {
      return reply.apiError('Endpoint removed', [], 404, 'ENDPOINT_REMOVED');
    }
  });

  // POST /refresh-favicons - admin only
  fastify.post('/refresh-favicons', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Refresh server favicons',
      description: 'Refresh favicons for servers that need updating (admin only)',
      body: {
        type: 'object',
        properties: {
          max_servers: { type: 'integer', minimum: 1, maximum: 500, default: 100 },
          older_than_days: { type: 'integer', minimum: 1, maximum: 365, default: 7 }
        }
      },
      response: {
        200: createApiResponse({
          type: 'object',
          properties: {
            refreshed: { type: 'integer' },
            successful: { type: 'integer' },
            withFavicon: { type: 'integer' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  server_id: { type: 'integer' },
                  success: { type: 'boolean' },
                  has_favicon: { type: 'boolean' },
                  error: { type: 'string' }
                }
              }
            }
          }
        }),
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate, requireRole('admin')],
    handler: async (request, reply) => {
      try {
        const { max_servers = 100, older_than_days = 7 } = request.body || {};
        const serverPingService = fastify.container.get('serverPingService');
        const result = await serverPingService.refreshFavicons({
          maxServers: max_servers,
          olderThanDays: older_than_days
        });
        return reply.apiSuccess(result, 'Favicon refresh completed');
      } catch (error) {
        fastify.log.error({ error: error.message, stack: error.stack }, 'Failed to refresh favicons');
        return reply.apiError('Internal server error', [], 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  });

  // POST /:id/toggle-featured - admin only
  fastify.post('/:id(\\d+)/toggle-featured', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Toggle server featured status',
      description: 'Toggle whether a server is featured (admin only)',
      response: {
        200: updateServerResponse,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate, requireRole('admin')],
    handler: serverController.toggleFeatured.bind(serverController)
  });
};
