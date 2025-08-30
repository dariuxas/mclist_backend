'use strict'

const fp = require('fastify-plugin');
const { authenticate, authorize } = require('../src/middleware/auth');

async function middlewarePlugin(fastify, options) {
    // Decorate fastify with authentication middleware
    fastify.decorate('authenticate', authenticate);
    
    // Decorate fastify with authorization middleware
    fastify.decorate('requireAdmin', authorize(['admin']));

    fastify.log.info('🛡️ Middleware plugin registered successfully');
}

module.exports = fp(middlewarePlugin, {
    name: 'middleware',
    dependencies: ['container', 'jwt']
});