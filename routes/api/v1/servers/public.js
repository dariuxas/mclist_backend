'use strict'

const { optionalAuthenticate } = require('../../../../src/middleware/auth');
const {
  getServersQuery,
  getServersResponse,
  getServerResponse,
  getServerStatsResponse,
  getTopServersResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
  const serverController = fastify.getService('serverController');

  // GET / - list servers
  fastify.get('/', {
    schema: {
      tags: ['Servers'],
      summary: 'Get all servers',
      description: 'Get paginated list of servers with filtering options',
      response: {
        200: getServersResponse,
        400: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [optionalAuthenticate],
    handler: serverController.getServers.bind(serverController)
  });

  // GET /stats - stats
  fastify.get('/stats', {
    schema: {
      tags: ['Servers'],
      summary: 'Get server statistics',
      description: 'Get overall server statistics',
      response: {
        200: getServerStatsResponse,
        500: errorResponse
      }
    },
    handler: serverController.getServerStats.bind(serverController)
  });

  // GET /top - top servers
  fastify.get('/top', {
    schema: {
      tags: ['Servers'],
      summary: 'Get top servers',
      description: 'Get top servers by player count',
      response: {
        200: getTopServersResponse,
        400: errorResponse,
        500: errorResponse
      }
    },
    handler: serverController.getTopServers.bind(serverController)
  });

  // GET /slug/:slug - by slug
  fastify.get('/slug/:slug', {
    schema: {
      tags: ['Servers'],
      summary: 'Get server by slug',
      description: 'Get detailed information about a specific server using SEO-friendly slug',
      response: {
        200: getServerResponse,
        400: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    handler: serverController.getServerBySlug.bind(serverController)
  });
};
