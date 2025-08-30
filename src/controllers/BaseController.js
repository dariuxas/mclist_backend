'use strict'

/**
 * Base Controller class providing common controller functionality
 * Implements dependency injection and standardized response handling
 */
class BaseController {
    constructor(service, logger) {
        this.service = service;
        this.logger = logger;
    }

    /**
     * Handle service errors and send appropriate responses
     * @param {Error} error - Service error
     * @param {Object} request - Fastify request object
     * @param {Object} reply - Fastify reply object
     * @param {string} operation - Operation being performed
     */
    handleError(error, request, reply, operation) {
        // Log the error with request context
        const logData = {
            error: error.message,
            operation,
            reqId: request.id,
            method: request.method,
            url: request.url,
            userId: request.user?.id,
            userAgent: request.headers['user-agent'],
            ip: request.ip
        };

        if (error.statusCode && error.statusCode < 500) {
            this.logger.warn(logData, `${operation} failed: ${error.message}`);
        } else {
            this.logger.error(logData, `${operation} error: ${error.message}`);
        }

        // Instead of calling reply.apiError, throw the error to be caught by global error handler
        // This ensures consistent error response format across all endpoints
        throw error;
    }

    /**
     * Send success response with logging
     * @param {Object} reply - Fastify reply object
     * @param {*} data - Response data
     * @param {string} message - Success message
     * @param {Object} meta - Additional metadata
     * @param {Object} request - Fastify request object
     * @param {string} operation - Operation performed
     */
    sendSuccess(reply, data, message, meta = {}, request = null, operation = null) {
        if (request && operation && this.logger) {
            this.logger.info({
                operation,
                reqId: request.id,
                userId: request.user?.id
            }, `${operation} completed successfully`);
        }

        return reply.success(data, message, meta);
    }

    /**
     * Extract pagination parameters from request query
     * @param {Object} query - Request query parameters
     * @returns {Object} Pagination parameters
     */
    extractPaginationParams(query) {
        const page = Math.max(1, parseInt(query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
        const search = query.search || '';
        
        return { page, limit, search };
    }

    /**
     * Validate request body against required fields
     * @param {Object} body - Request body
     * @param {Array} requiredFields - Required field names
     * @param {Object} reply - Fastify reply object
     * @returns {boolean} True if valid, sends error response if invalid
     */
    validateRequiredFields(body, requiredFields, reply) {
        const missingFields = requiredFields.filter(field => 
            body[field] === undefined || body[field] === null || body[field] === ''
        );

        if (missingFields.length > 0) {
            reply.apiError(
                `Trūksta privalomų laukų: ${missingFields.join(', ')}`,
                [],
                400,
                'VALIDATION_ERROR'
            );
            return false;
        }

        return true;
    }

    /**
     * Bind controller methods to preserve 'this' context
     * Call this in constructor of derived classes
     */
    bindMethods() {
        const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
            .filter(name => name !== 'constructor' && typeof this[name] === 'function');

        methods.forEach(method => {
            this[method] = this[method].bind(this);
        });
    }
}

module.exports = BaseController;