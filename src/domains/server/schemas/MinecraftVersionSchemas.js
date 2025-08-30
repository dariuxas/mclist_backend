'use strict'

const { createApiResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');

const minecraftVersionObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        version: { type: 'string' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
    }
};

const getMinecraftVersionsResponse = createApiResponse({
    type: 'object',
    properties: {
        versions: {
            type: 'array',
            items: minecraftVersionObject
        }
    },
    required: ['versions']
});

module.exports = {
    minecraftVersionObject,
    getMinecraftVersionsResponse
};