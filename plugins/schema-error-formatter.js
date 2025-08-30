'use strict'

const fp = require('fastify-plugin');

async function schemaErrorFormatterPlugin(fastify, options) {
    const ValidationErrorFormatter = require('../src/shared/validation/ValidationErrorFormatter');
    
    // Custom schema error formatter - create validation error that error handler will catch
    fastify.setSchemaErrorFormatter((errors, dataVar, request) => {
        fastify.log.info('🔍 Schema error formatter: processing ' + errors.length + ' errors', {
            errorsPreview: errors.slice(0, 2),
            dataVar: dataVar,
            requestBody: request?.body || 'no body',
            bodyKeys: request?.body ? Object.keys(request.body) : 'no body'
        });
        
        // Format errors using our ValidationErrorFormatter
        const formattedErrors = ValidationErrorFormatter.formatErrors(errors);
        
        // Create error map for backward compatibility
        const errorsMap = {};
        Object.keys(formattedErrors.errors).forEach(field => {
            const fieldErrors = formattedErrors.errors[field];
            errorsMap[field] = fieldErrors.map(e => e.message).join('; ');
        });

        const isDevelopment = process.env.NODE_ENV !== 'production';

        const validationResponse = {
            success: false,
            message: ValidationErrorFormatter.createSummary(formattedErrors),
            data: null,
            errors: errorsMap,
            errorCode: 'VALIDATION_ERROR',
            meta: {
                timestamp: new Date().toISOString(),
                requestId: request?.id || 'unknown',
                language: 'lt'
            }
        };

        // Add validation details if there are validation errors
        if (formattedErrors.hasErrors) {
            validationResponse.validation = {
                hasErrors: formattedErrors.hasErrors,
                fields: formattedErrors.errors,
                summary: formattedErrors.summary,
                count: formattedErrors.summary.length
            };
        }

        // Add debug info in development
        if (isDevelopment) {
            validationResponse.debug = {
                originalErrors: errors,
                nodeEnv: process.env.NODE_ENV
            };
        }

        fastify.log.info('🔍 Schema error formatter: formatted response', {
            hasErrors: formattedErrors.hasErrors,
            errorCount: formattedErrors.summary.length,
            fieldCount: Object.keys(formattedErrors.errors).length
        });

        // Create an error object that bypasses schema validation
        const validationError = new Error('Schema validation failed');
        validationError.statusCode = 400;
        validationError.validationResponse = validationResponse;

        return validationError;
    });

    fastify.log.info('📋 Schema error formatter registered successfully');
}

module.exports = fp(schemaErrorFormatterPlugin, {
    name: 'schema-error-formatter'
});
