'use strict';

/**
 * Simple, unified error handler
 * Replaces all the complicated error handling mess
 */
class ErrorHandler {
    /**
     * Create business logic error
     */
    static createError(message, statusCode = 400, errorCode = 'BUSINESS_ERROR') {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.errorCode = errorCode;
        return error;
    }

    /**
     * Handle all errors consistently
     */
    static handleError(error, request, reply) {
        const isDev = process.env.NODE_ENV !== 'production';
        
        // Log error
        request.log.error({
            err: error,
            reqId: request.id,
            method: request.method,
            url: request.url,
            ip: request.ip
        }, error.message || 'Error occurred');

        // Standard response format
        const response = {
            success: false,
            message: error.message || 'Įvyko klaida',
            data: null,
            errors: {},
            errorCode: error.errorCode || 'INTERNAL_ERROR',
            meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
                language: 'lt'
            }
        };

        // Add debug info in development
        if (isDev && error.stack) {
            response.debug = { stack: error.stack };
        }

        // Determine status code
        let statusCode = 500;
        if (error.statusCode && error.statusCode >= 400) {
            statusCode = error.statusCode;
        }

        return reply.status(statusCode).send(response);
    }

    /**
     * Create validation error with proper structure
     */
    static createValidationError(errors, message = 'Validacijos klaida') {
        const error = new Error(message);
        error.statusCode = 400;
        error.errorCode = 'VALIDATION_ERROR';
        
        // Create validation response structure matching schema validation format
        error.validationResponse = {
            success: false,
            message: message,
            data: null,
            errors: errors,
            errorCode: 'VALIDATION_ERROR',
            meta: {
                timestamp: new Date().toISOString(),
                requestId: 'req-temp', // Will be set by error handler
                language: 'lt'
            },
            validation: {
                hasErrors: true,
                fields: Object.keys(errors).reduce((acc, field) => {
                    acc[field] = [{
                        code: 'duplicate',
                        message: errors[field],
                        path: field,
                        constraint: {},
                        hint: null
                    }];
                    return acc;
                }, {}),
                summary: Object.keys(errors).map(field => ({
                    field: field,
                    message: errors[field],
                    code: 'duplicate'
                })),
                count: Object.keys(errors).length
            }
        };
        
        return error;
    }

    /**
     * Common business logic error types
     */
    static notFound(message = 'Išteklius nerastas') {
        return this.createError(message, 404, 'NOT_FOUND');
    }

    static forbidden(message = 'Neturite teisių') {
        return this.createError(message, 403, 'FORBIDDEN');
    }

    static conflict(message = 'Konfliktas') {
        return this.createError(message, 409, 'CONFLICT');
    }

    static badRequest(message = 'Neteisingas užklausimas') {
        return this.createError(message, 400, 'BAD_REQUEST');
    }

    static unauthorized(message = 'Neautorizuotas') {
        return this.createError(message, 401, 'UNAUTHORIZED');
    }

    static serverError(message = 'Serverio klaida') {
        return this.createError(message, 500, 'SERVER_ERROR');
    }
}

module.exports = ErrorHandler;