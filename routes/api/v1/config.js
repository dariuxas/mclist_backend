'use strict'

const { 
    getPublicConfigsResponse
} = require('../../../src/domains/config/schemas/ConfigSchemas');

const { errorResponse } = require('../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    const configService = fastify.getService('configService');

    // Get public configs (no authentication required)
    fastify.get('/public', {
        schema: {
      tags: ['Configuration'],
            summary: 'Get public configurations',
            description: 'Get publicly visible system configurations',
            response: {
                200: getPublicConfigsResponse,
                500: errorResponse
            }
        },
        handler: async (request, reply) => {
            const configs = await configService.getPublic();
            
            return reply.success({
                configs
            }, 'Public configurations retrieved successfully');
        }
    });

    fastify.log.info('⚙️  Public config routes registered');
};