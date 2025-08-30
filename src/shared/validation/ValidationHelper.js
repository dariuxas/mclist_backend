'use strict';

const ValidationErrorFormatter = require('./ValidationErrorFormatter');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

/**
 * Centralized validation helper using the new Lithuanian validation system
 */
class ValidationHelper {
    constructor() {
        this.ajv = new Ajv({ allErrors: true });
        addFormats(this.ajv);
    }

    /**
     * Validate data against a schema and return formatted error response if invalid
     */
    async validateRequest(data, schema) {
        const validate = this.ajv.compile(schema);
        const isValid = validate(data);

        if (!isValid) {
            const formattedErrors = ValidationErrorFormatter.formatErrors(validate.errors);
            
            return {
                isValid: false,
                errorResponse: {
                    success: false,
                    message: ValidationErrorFormatter.createSummary(formattedErrors),
                    data: null,
                    errors: formattedErrors.errors,
                    errorCode: 'VALIDATION_ERROR',
                    validation: {
                        hasErrors: formattedErrors.hasErrors,
                        fields: formattedErrors.errors,
                        summary: formattedErrors.summary,
                        count: formattedErrors.summary.length
                    },
                    meta: {
                        timestamp: new Date().toISOString(),
                        language: 'lt'
                    }
                }
            };
        }

        return { isValid: true };
    }

    /**
     * Common validation schemas for server operations
     */
    static getSchemas() {
        return {
            updateServerName: {
                type: 'object',
                required: ['server_id', 'name'],
                properties: {
                    server_id: { type: 'integer', minimum: 1 },
                    name: { type: 'string', minLength: 1, maxLength: 100 }
                },
                additionalProperties: false
            },
            updateServerDescription: {
                type: 'object',
                required: ['server_id', 'description'],
                properties: {
                    server_id: { type: 'integer', minimum: 1 },
                    description: { type: 'string', maxLength: 1000 }
                },
                additionalProperties: false
            },
            updateServerTypes: {
                type: 'object',
                required: ['server_id', 'server_type_ids'],
                properties: {
                    server_id: { type: 'integer', minimum: 1 },
                    server_type_ids: {
                        type: 'array',
                        items: { type: 'integer', minimum: 1 },
                        minItems: 1,
                        maxItems: 5
                    }
                },
                additionalProperties: false
            },
            updateServerIp: {
                type: 'object',
                required: ['server_id', 'host', 'port'],
                properties: {
                    server_id: { type: 'integer', minimum: 1 },
                    host: { type: 'string', minLength: 1, maxLength: 255 },
                    port: { type: 'integer', minimum: 1, maximum: 65535 }
                },
                additionalProperties: false
            }
        };
    }
}

module.exports = ValidationHelper;