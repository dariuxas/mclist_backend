'use strict'

/**
 * Reusable user schema components
 * These can be composed into larger schemas
 */

const baseUserSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        role: { type: 'string' },
        created_at: { type: 'string', format: 'date-time' },
        last_activity: { type: ['string', 'null'], format: 'date-time' },
    }
};

const privateUserSchema = {
    type: 'object',
    properties: {
        ...baseUserSchema.properties,
        email: { type: 'string' },
        updated_at: { type: 'string', format: 'date-time' },
        last_login: { type: ['string', 'null'], format: 'date-time' }
    }
};


module.exports = {
    baseUserSchema,
    privateUserSchema,
};