'use strict'

const { authenticate } = require('../../../../src/middleware/auth');
const {
  getServerResponse,
  serverOwnershipResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');
const { errorResponse, createApiResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
  const serverController = fastify.getService('serverController');
  const voteService = fastify.getService('voteService');

  // GET /:id - get by id
  fastify.get('/:id(\\d+)', {
    schema: {
      tags: ['Servers'],
      summary: 'Get server by ID',
      description: 'Get detailed information about a specific server',
      response: {
        200: getServerResponse,
        400: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    handler: serverController.getServerById.bind(serverController)
  });

  // GET /:id/is-owned - check ownership
  fastify.get('/:id(\\d+)/is-owned', {
    schema: {
      tags: ['Servers'],
      security: [{ bearerAuth: [] }],
      summary: 'Check if server is owned by user',
      description: 'Check if the authenticated user owns this server',
      response: {
        200: serverOwnershipResponse,
        400: errorResponse,
        401: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    preHandler: [authenticate],
    handler: serverController.checkServerOwnership.bind(serverController)
  });

  // GET /:id/stats - get detailed server statistics
  fastify.get('/:id(\\d+)/stats', {
    schema: {
      tags: ['Servers'],
      summary: 'Get detailed server statistics',
      description: 'Returns comprehensive statistics for a specific server including player count history, voting stats, and performance metrics',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      },
      response: {
        200: createApiResponse({
          type: 'object',
          properties: {
            stats: {
              type: 'object',
              properties: {
                server_info: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    host: { type: 'string' },
                    port: { type: 'integer' },
                    max_players: { type: ['integer', 'null'] }
                  },
                  required: ['id', 'name', 'host', 'port']
                },
                current_stats: {
                  type: ['object', 'null'],
                  properties: {
                    id: { type: 'integer' },
                    server_id: { type: 'integer' },
                    data: { 
                      type: 'object',
                      additionalProperties: true
                    },
                    created_at: { type: 'string', format: 'date-time' }
                  }
                },
                voting_stats: {
                  type: 'object',
                  properties: {
                    total_votes: { type: 'integer' },
                    daily_votes: { type: 'integer' },
                    weekly_votes: { type: 'integer' },
                    monthly_votes: { type: 'integer' }
                  },
                  required: ['total_votes', 'daily_votes', 'weekly_votes', 'monthly_votes']
                },
                hourly_player_data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      timestamp: { type: 'string', format: 'date-time' },
                      player_count: { type: 'integer' },
                      online: { type: 'boolean' }
                    },
                    required: ['timestamp', 'player_count', 'online']
                  }
                },
                daily_stats: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string', format: 'date' },
                      max_players: { type: 'integer' },
                      avg_players: { type: 'number' },
                      uptime_percentage: { type: 'number' }
                    },
                    required: ['date', 'max_players', 'avg_players', 'uptime_percentage']
                  }
                },
                recent_data: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      server_id: { type: 'integer' },
                      data: { 
                        type: 'object',
                        additionalProperties: true
                      },
                      created_at: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              },
              required: ['server_info', 'voting_stats', 'hourly_player_data', 'daily_stats', 'recent_data']
            }
          },
          required: ['stats']
        }),
        400: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    handler: serverController.getServerStatsById.bind(serverController)
  });

  // GET /:id/top-voters - top voters by username
  fastify.get('/:id(\\d+)/top-voters', {
    schema: {
      tags: ['Servers'],
      summary: 'Get top voters for a server',
      description: 'Returns top usernames by number of votes for the specified server',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', pattern: '^\\d+$' }
        },
        required: ['id']
      },
      response: {
        200: createApiResponse({
          type: 'object',
          properties: {
            voters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  vote_count: { type: 'integer' }
                },
                required: ['username', 'vote_count']
              }
            }
          },
          required: ['voters']
        }),
        400: errorResponse,
        404: errorResponse,
        500: errorResponse
      }
    },
    handler: async (request, reply) => {
      const serverId = parseInt(request.params.id);
      const { limit = 10 } = request.query || {};
      try {
        const voters = await voteService.getTopVotersByServer(serverId, limit);
        return reply.apiSuccess({ voters }, 'Top voters retrieved successfully');
      } catch (error) {
        // Utilize BaseController-like error response shape if available on reply
        const status = error.statusCode || 500;
        const code = error.code || 'INTERNAL_SERVER_ERROR';
        const message = error.message || 'Failed to get top voters';
        if (reply.apiError) {
          return reply.apiError(message, [], status, code);
        }
        reply.code(status).send({ error: { code, message } });
      }
    }
  });
};
