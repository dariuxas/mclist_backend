'use strict'

const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
  const serverController = fastify.getService('serverController');

  // GET /:id/favicon - favicon metadata
  fastify.get('/:id(\\d+)/favicon', {
    schema: {
      tags: ['Servers'],
      summary: 'Get server favicon',
      description: 'Get the favicon for a specific server',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                favicon_url: { type: ['string', 'null'] },
                has_favicon: { type: 'boolean' },
                updated_at: { type: ['string', 'null'] }
              }
            }
          }
        },
        404: errorResponse
      }
    },
    handler: async (request, reply) => {
      try {
        const serverId = parseInt(request.params.id);
        if (isNaN(serverId)) {
          return reply.apiError('Invalid server ID', [], 400, 'INVALID_SERVER_ID');
        }

        const server = await serverController.serverService.getServerById(serverId);
        if (!server) {
          return reply.apiError('Server not found', [], 404, 'SERVER_NOT_FOUND');
        }

        const serverDataRepository = fastify.container.get('serverDataRepository');
        const serverData = await serverDataRepository.findByServerId(serverId);

        if (!serverData || !serverData.favicon) {
          return reply.apiSuccess({ favicon_url: null, has_favicon: false, updated_at: null }, 'No favicon available');
        }

        return reply.apiSuccess({
          favicon_url: serverData.getFaviconUrl(),
          has_favicon: serverData.hasFavicon(),
          updated_at: null
        }, 'Favicon retrieved successfully');

      } catch (error) {
        fastify.log.error({ error: error.message, stack: error.stack }, 'Failed to get server favicon');
        return reply.apiError('Internal server error', [], 500, 'INTERNAL_SERVER_ERROR');
      }
    }
  });

  // GET /:id/favicon.png - serve image
  fastify.get('/:id(\\d+)/favicon.png', {
    schema: {
      tags: ['Servers'],
      summary: 'Get server favicon as image',
      description: 'Get the favicon for a specific server as a PNG image',
      response: { 200: { type: 'string', format: 'binary' }, 404: errorResponse }
    },
    handler: async (request, reply) => {
      try {
        const serverId = parseInt(request.params.id);
        if (isNaN(serverId)) {
          return reply.code(404).send('Server not found');
        }

        const server = await serverController.serverService.getServerById(serverId);
        if (!server) {
          return reply.code(404).send('Server not found');
        }

        const serverDataRepository = fastify.container.get('serverDataRepository');
        const serverData = await serverDataRepository.findByServerId(serverId);

        if (!serverData || !serverData.favicon) {
          return reply.code(404).send('No favicon available');
        }

        const faviconUrl = serverData.getFaviconUrl();
        if (!faviconUrl) {
          return reply.code(404).send('No favicon available');
        }

        return reply.redirect(301, faviconUrl);

      } catch (error) {
        fastify.log.error({ error: error.message, stack: error.stack }, 'Failed to serve server favicon');
        return reply.code(500).send('Internal server error');
      }
    }
  });
};
