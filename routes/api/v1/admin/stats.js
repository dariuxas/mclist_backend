'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const {
  createApiResponse,
  errorResponse,
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const { adminStatsObject } = require('../../../../src/domains/admin/schemas/AdminSchemas');

module.exports = async function (fastify) {
  fastify.get('/', {
    schema: {
      tags: ['Admin - Stats'],
      security: [{ bearerAuth: [] }],
      summary: 'Get aggregated admin statistics',
      response: {
        200: createApiResponse({
          type: 'object',
          properties: {
            stats: adminStatsObject,
          },
        }),
        400: errorResponse,
        401: errorResponse,
        403: errorResponse,
        500: errorResponse,
      },
    },
    preHandler: [authenticate, requireRole('admin')],
    handler: async (request, reply) => {
      const userRepository = fastify.getService('userRepository');
      const serverRepository = fastify.getService('serverRepository');
      const voteRepository = fastify.getService('voteRepository');

      // Use a 7-day window for "this week"
      const days = 7;

      const [
        totalUsers,
        newUsersWeek,
        totalServers,
        activeServers,
        newServersWeek,
        totalVotes,
        votesWeek,
      ] = await Promise.all([
        userRepository.countTotal(),
        userRepository.countNewSinceDays(days),
        serverRepository.countAll(),
        serverRepository.countActive(),
        serverRepository.countCreatedSinceDays(days),
        voteRepository.countTotal(),
        voteRepository.countSinceDays(days),
      ]);

      return reply.apiSuccess(
        {
          stats: {
            total_users: parseInt(totalUsers, 10) || 0,
            new_users_week: parseInt(newUsersWeek, 10) || 0,
            total_servers: parseInt(totalServers, 10) || 0,
            active_servers: parseInt(activeServers, 10) || 0,
            new_servers_week: parseInt(newServersWeek, 10) || 0,
            total_votes: parseInt(totalVotes, 10) || 0,
            votes_week: parseInt(votesWeek, 10) || 0,
          },
        },
        'Admin stats retrieved successfully',
      );
    },
  });

  fastify.log.info('📊 Admin stats routes registered');
};
