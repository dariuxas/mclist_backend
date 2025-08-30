'use strict'

const { authenticate } = require('../../../../src/middleware/auth');
const {
  getServersQuery,
  getServersResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
  const serverController = fastify.getService('serverController');

  // GET /owned - servers owned by authenticated user
  fastify.get('/', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Get owned servers',
      description: 'Get paginated list of servers owned by the authenticated user with filtering options',
      
      response: {
        200: getServersResponse,
        400: errorResponse,
        401: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [
      authenticate,
      async function setOwnedFlag(request, reply) {
        request.query = { ...request.query, owned: 'true' };
      }
    ],
    handler: serverController.getServers.bind(serverController)
  });
};
