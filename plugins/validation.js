'use strict';

const fp = require('fastify-plugin');
const ValidationMiddleware = require('../src/middleware/validationMiddleware');

/**
 * Fastify plugin for validation system
 * Registers validation routes and middleware
 */
async function validationPlugin(fastify, options) {
    try {
        const validationMiddleware = new ValidationMiddleware();

        // Register validation routes
        validationMiddleware.registerRoutes(fastify);

        // Add validation helper to fastify instance
        fastify.decorate('validation', {
            validateField: validationMiddleware.validateField.bind(validationMiddleware),
            validateFields: validationMiddleware.validateFields.bind(validationMiddleware),
            getSchemaConstraints: validationMiddleware.getSchemaConstraints.bind(validationMiddleware)
        });

        fastify.log.info('✅ Validation plugin registered successfully');
    } catch (error) {
        fastify.log.error({ error: error.message }, '❌ Failed to register validation plugin');
        throw error;
    }
}

module.exports = fp(validationPlugin, {
    name: 'validation-plugin'
});
