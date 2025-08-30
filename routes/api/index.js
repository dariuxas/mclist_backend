'use strict'

module.exports = async function (fastify, opts) {
    // Register API v1 routes
    await fastify.register(require('./v1'), { prefix: '/v1' });

    fastify.log.info('🔗 API routes registered successfully');
};