'use strict'

module.exports = async function (fastify) {
    // Register admin sub-routes
    await fastify.register(require('./server-types'), { prefix: '/server-types' });
    await fastify.register(require('./servers'), { prefix: '/servers' });
    await fastify.register(require('./users'), { prefix: '/users' });
    await fastify.register(require('./config'), { prefix: '/config' });
    await fastify.register(require('./stats'), { prefix: '/stats' });

    fastify.log.info('👑 Admin routes registered');
};