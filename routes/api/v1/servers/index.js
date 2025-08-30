'use strict'

const { authenticate, optionalAuthenticate, requireRole } = require('../../../../src/middleware/auth');
const {
    createServerBody,
    updateServerBody,
    getServersQuery,
    getServersResponse,
    getServerResponse,
    createServerResponse,
    updateServerResponse,
    deleteServerResponse,
    pingServerResponse,
    getServerStatsResponse,
    getTopServersResponse,
    serverOwnershipResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');
const { errorResponse, createApiResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    // Modular sub-routers
    await fastify.register(require('./public'));
    await fastify.register(require('./owned'), { prefix: '/owned' });
    await fastify.register(require('./item'));
    await fastify.register(require('./mutations'));
    await fastify.register(require('./assets'));
    await fastify.register(require('./admin'));

    fastify.log.info('🖥️  Server routes registered');
};