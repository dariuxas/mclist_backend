'use strict'

const fp = require('fastify-plugin');

async function responsePlugin(fastify, options) {
    // Response helper class for programmatic use
    class APIResponse {
        static success(data = null, message = 'Success', meta = {}) {
            return {
                success: true,
                message,
                data,
                errors: [],
                meta: {
                    timestamp: new Date().toISOString(),
                    ...meta
                }
            };
        }

        static error(message = 'An error occurred', errors = [], statusCode = 400, errorCode = 'GENERIC_ERROR') {
            const response = {
                success: false,
                message,
                data: null,
                errors: Array.isArray(errors) ? errors : [errors],
                errorCode: errorCode || 'GENERIC_ERROR', // Always provide a default
                meta: {
                    timestamp: new Date().toISOString()
                }
            };

            return response;
        }
    }

    // Decorate the fastify instance with response helpers
    fastify.decorate('response', APIResponse);

    // Add only our custom decorators (avoid conflicts with @fastify/sensible)
    fastify.decorateReply('success', function(data = null, message = 'Success', meta = {}) {
        const response = APIResponse.success(data, message, {
            requestId: this.request.id,
            language: 'en',
            ...meta
        });
        return this.send(response);
    });

    // Backwards-compat alias used across routes
    fastify.decorateReply('apiSuccess', function(data = null, message = 'Success', meta = {}) {
        return this.success(data, message, meta);
    });

    fastify.decorateReply('apiError', function(message = 'An error occurred', errors = [], statusCode = 400, errorCode = 'GENERIC_ERROR') {
        const response = APIResponse.error(message, errors, statusCode, errorCode || 'GENERIC_ERROR');
        response.meta.requestId = this.request.id;
        response.meta.language = 'en';
        response.meta.timestamp = new Date().toISOString();
        return this.status(statusCode).send(response);
    });

    fastify.decorateReply('paginated', function(data, pagination) {
        const message = 'Data retrieved successfully';
        const response = APIResponse.success(data, message);
        response.meta.requestId = this.request.id;
        response.meta.language = 'en';
        response.meta.pagination = {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: pagination.total || 0,
            totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
            hasNext: (pagination.page || 1) * (pagination.limit || 10) < (pagination.total || 0),
            hasPrev: (pagination.page || 1) > 1
        };
        return this.send(response);
    });

    fastify.log.info('📋 Response formatting plugin registered successfully');
}

module.exports = fp(responsePlugin, {
    name: 'response'
});