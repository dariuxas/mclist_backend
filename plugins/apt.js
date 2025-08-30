'use strict'

const fp = require('fastify-plugin');

async function apitallyPlugin(fastify) {
    try {
        
        // Import the apitally plugin
        const { apitallyPlugin: apitally } = require('apitally/fastify');
        
        // Register Apitally monitoring plugin
        await fastify.register(apitally, {
            clientId: "2bc34028-fe1e-4756-aa88-d0b0af3851f0",
            env: process.env.NODE_ENV === 'production' ? 'prod' : 'dev',
            requestLogging: {
                enabled: true,
                logRequestHeaders: true,
                logRequestBody: true,
                logResponseBody: true,
            },
        });

        fastify.log.info('✅ Apitally monitoring plugin registered');
    } catch (error) {
        fastify.log.warn({ error: error.message }, '⚠️ Failed to register Apitally plugin');
    }
}

module.exports = fp(apitallyPlugin, {
    name: 'apitally'
});