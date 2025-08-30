'use strict'

const { authenticate } = require('../../../../src/middleware/auth');
const {
  createServerBody,
  updateServerBody,
  createServerResponse,
  updateServerResponse,
  deleteServerResponse,
  pingServerResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
  const serverController = fastify.getService('serverController');

  // POST / - create server
  fastify.post('/', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Create new server',
      description: 'Create a new Minecraft server entry',
      body: createServerBody,
      response: {
        201: createServerResponse,
        400: errorResponse,
        401: errorResponse,
        409: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate],
    handler: serverController.createServer.bind(serverController)
  });

  // PUT /:id - update
  fastify.put('/:id(\\d+)', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Update server',
      description: 'Update server information (owner or admin only)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      },
      body: updateServerBody,
      response: {
        200: updateServerResponse,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        409: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate],
    handler: serverController.updateServer.bind(serverController)
  });

  // DELETE /:id - delete
  fastify.delete('/:id(\\d+)', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Delete server',
      description: 'Delete server (owner or admin only)',
      response: {
        200: deleteServerResponse,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate],
    handler: serverController.deleteServer.bind(serverController)
  });

  // POST /:id/ping - ping server
  fastify.post('/:id(\\d+)/ping', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Ping server',
      description: 'Manually ping a server to check its status',
      response: {
        200: pingServerResponse,
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate],
    handler: serverController.pingServer.bind(serverController)
  });
};
