'use strict';

const ValidationErrorFormatter = require('../shared/validation/ValidationErrorFormatter');
const schemaRegistry = require('../shared/validation/SchemaRegistry');

/**
 * Validation middleware for real-time field validation
 * Provides endpoints for frontend to validate individual fields
 */
class ValidationMiddleware {
    constructor() {
        // Initialize schema registry with error handling
        try {
            schemaRegistry.initialize();
            console.log('✅ Schema registry initialized successfully');
        } catch (error) {
            console.warn('⚠️ Failed to initialize schema registry:', error.message);
            // Continue without schema registry for now
        }
    }

    /**
     * Validate a single field
     */
    async validateField(request, reply) {
        const { schema, field, value } = request.body;

        if (!schemaRegistry.has(schema)) {
            return reply.status(400).send({
                success: false,
                message: 'Schema nerasta',
                errors: { schema: 'Neteisingas schemos pavadinimas' }
            });
        }

        const schemaDefinition = schemaRegistry.get(schema);
        const fieldSchema = this.extractFieldSchema(schemaDefinition, field);

        if (!fieldSchema) {
            return reply.status(400).send({
                success: false,
                message: 'Laukas nerastas schemoje',
                errors: { field: 'Neteisingas lauko pavadinimas' }
            });
        }

        try {
            // Create a temporary object to validate
            const testObject = { [field]: value };
            const tempSchema = {
                type: 'object',
                properties: { [field]: fieldSchema },
                required: fieldSchema.required ? [field] : []
            };

            // Use Fastify's validator
            const validate = request.server.getSchema(`temp-${Date.now()}`);
            if (!validate) {
                // Compile schema on the fly
                const ajv = request.server.ajv;
                const compiledSchema = ajv.compile(tempSchema);
                const isValid = compiledSchema(testObject);

                if (!isValid) {
                    const formattedErrors = ValidationErrorFormatter.formatErrors(compiledSchema.errors);
                    return reply.send({
                        success: false,
                        valid: false,
                        errors: formattedErrors.errors[field] || [],
                        message: formattedErrors.summary[0]?.message || 'Validacija nepavyko'
                    });
                }
            }

            return reply.send({
                success: true,
                valid: true,
                message: 'Laukas teisingas'
            });

        } catch (error) {
            return reply.status(500).send({
                success: false,
                message: 'Validacijos klaida',
                errors: { general: 'Vidinė validacijos klaida' }
            });
        }
    }

    /**
     * Validate multiple fields at once
     */
    async validateFields(request, reply) {
        const { schema, fields } = request.body;

        if (!schemaRegistry.has(schema)) {
            return reply.status(400).send({
                success: false,
                message: 'Schema nerasta',
                errors: { schema: 'Neteisingas schemos pavadinimas' }
            });
        }

        const schemaDefinition = schemaRegistry.get(schema);
        const results = {};
        let hasErrors = false;

        for (const [fieldName, fieldValue] of Object.entries(fields)) {
            const fieldSchema = this.extractFieldSchema(schemaDefinition, fieldName);
            
            if (!fieldSchema) {
                results[fieldName] = {
                    valid: false,
                    errors: [{ message: 'Laukas nerastas schemoje', code: 'unknown_field' }]
                };
                hasErrors = true;
                continue;
            }

            try {
                const testObject = { [fieldName]: fieldValue };
                const tempSchema = {
                    type: 'object',
                    properties: { [fieldName]: fieldSchema },
                    required: fieldSchema.required ? [fieldName] : []
                };

                const ajv = request.server.ajv;
                const compiledSchema = ajv.compile(tempSchema);
                const isValid = compiledSchema(testObject);

                if (isValid) {
                    results[fieldName] = { valid: true, errors: [] };
                } else {
                    const formattedErrors = ValidationErrorFormatter.formatErrors(compiledSchema.errors);
                    results[fieldName] = {
                        valid: false,
                        errors: formattedErrors.errors[fieldName] || []
                    };
                    hasErrors = true;
                }
            } catch (error) {
                results[fieldName] = {
                    valid: false,
                    errors: [{ message: 'Validacijos klaida', code: 'validation_error' }]
                };
                hasErrors = true;
            }
        }

        return reply.send({
            success: true,
            valid: !hasErrors,
            results,
            summary: hasErrors ? 'Kai kurie laukai turi validacijos klaidų' : 'Visi laukai teisingi'
        });
    }

    /**
     * Get validation constraints for a schema
     */
    async getSchemaConstraints(request, reply) {
        const { schema } = request.params;

        if (!schemaRegistry.has(schema)) {
            return reply.status(404).send({
                success: false,
                message: 'Schema nerasta'
            });
        }

        const schemaDefinition = schemaRegistry.get(schema);
        const constraints = this.extractConstraints(schemaDefinition);

        return reply.send({
            success: true,
            data: {
                schema,
                constraints
            }
        });
    }

    /**
     * Extract field schema from main schema
     */
    extractFieldSchema(schema, fieldName) {
        if (schema.properties && schema.properties[fieldName]) {
            return schema.properties[fieldName];
        }

        // Handle nested schemas
        if (schema.allOf) {
            for (const subSchema of schema.allOf) {
                const fieldSchema = this.extractFieldSchema(subSchema, fieldName);
                if (fieldSchema) return fieldSchema;
            }
        }

        return null;
    }

    /**
     * Extract validation constraints from schema
     */
    extractConstraints(schema, prefix = '') {
        const constraints = {};

        if (schema.properties) {
            for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
                const fullFieldName = prefix ? `${prefix}.${fieldName}` : fieldName;
                constraints[fullFieldName] = this.extractFieldConstraints(fieldSchema);
            }
        }

        if (schema.allOf) {
            for (const subSchema of schema.allOf) {
                Object.assign(constraints, this.extractConstraints(subSchema, prefix));
            }
        }

        return constraints;
    }

    /**
     * Extract constraints from a single field schema
     */
    extractFieldConstraints(fieldSchema) {
        const constraints = {
            type: fieldSchema.type,
            required: false
        };

        // Add various constraints
        if (fieldSchema.minLength !== undefined) constraints.minLength = fieldSchema.minLength;
        if (fieldSchema.maxLength !== undefined) constraints.maxLength = fieldSchema.maxLength;
        if (fieldSchema.minimum !== undefined) constraints.min = fieldSchema.minimum;
        if (fieldSchema.maximum !== undefined) constraints.max = fieldSchema.maximum;
        if (fieldSchema.pattern) constraints.pattern = fieldSchema.pattern;
        if (fieldSchema.format) constraints.format = fieldSchema.format;
        if (fieldSchema.enum) constraints.enum = fieldSchema.enum;

        return constraints;
    }

    /**
     * Register routes for validation endpoints
     */
    registerRoutes(fastify) {
        // Single field validation
        fastify.post('/api/validate/field', {
            schema: {
                body: {
                    type: 'object',
                    required: ['schema', 'field', 'value'],
                    properties: {
                        schema: { type: 'string' },
                        field: { type: 'string' },
                        value: {} // Any type
                    }
                }
            }
        }, this.validateField.bind(this));

        // Multiple fields validation
        fastify.post('/api/validate/fields', {
            schema: {
                body: {
                    type: 'object',
                    required: ['schema', 'fields'],
                    properties: {
                        schema: { type: 'string' },
                        fields: { type: 'object' }
                    }
                }
            }
        }, this.validateFields.bind(this));

        // Get schema constraints
        fastify.get('/api/validate/schema/:schema/constraints', {
            schema: {
                params: {
                    type: 'object',
                    required: ['schema'],
                    properties: {
                        schema: { type: 'string' }
                    }
                }
            }
        }, this.getSchemaConstraints.bind(this));
    }
}

module.exports = ValidationMiddleware;
