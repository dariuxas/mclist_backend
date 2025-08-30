'use strict'

const { createApiResponse, createPaginatedResponse, errorResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');

// Server type creation schema
const createServerTypeBody = {
    type: 'object',
    required: ['name'],
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: '^[a-z0-9_-]+$',
            description: 'Server type name (lowercase, alphanumeric, underscore, hyphen only)'
        },
        description: {
            type: 'string',
            maxLength: 500,
            description: 'Server type description'
        },
        color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            default: '#3498db',
            description: 'Hex color code for the server type'
        },
        icon: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            default: 'server',
            description: 'Icon name for the server type'
        },
        is_active: {
            type: 'boolean',
            default: true,
            description: 'Whether the server type is active'
        }
    },
    additionalProperties: false
};

// Server type update schema
const updateServerTypeBody = {
    type: 'object',
    properties: {
        name: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: '^[a-z0-9_-]+$',
            description: 'Server type name (lowercase, alphanumeric, underscore, hyphen only)'
        },
        description: {
            type: 'string',
            maxLength: 500,
            description: 'Server type description'
        },
        color: {
            type: 'string',
            pattern: '^#[0-9A-Fa-f]{6}$',
            description: 'Hex color code for the server type'
        },
        icon: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Icon name for the server type'
        },
        is_active: {
            type: 'boolean',
            description: 'Whether the server type is active'
        }
    },
    additionalProperties: false
};

// Server type query parameters
const getServerTypesQuery = {
    type: 'object',
    properties: {
        is_active: {
            type: 'string',
            enum: ['true', 'false'],
            description: 'Filter by active status'
        },
        include_server_count: {
            type: 'string',
            enum: ['true', 'false'],
            default: 'true',
            description: 'Include server count for each type'
        }
    },
    additionalProperties: false
};

// Server type response schemas
const serverTypeObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        description: { type: ['string', 'null'] },
        color: { type: 'string' },
        icon: { type: 'string' },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        server_count: { type: 'integer' }
    }
};

const getServerTypesResponse = createPaginatedResponse(serverTypeObject, 'server_types');

const getServerTypeResponse = createApiResponse({
    type: 'object',
    properties: { server_type: serverTypeObject },
    required: ['server_type']
});

const createServerTypeResponse = getServerTypeResponse;

const updateServerTypeResponse = createServerTypeResponse;

const deleteServerTypeResponse = createApiResponse({ type: 'object' });

module.exports = {
    createServerTypeBody,
    updateServerTypeBody,
    getServerTypesQuery,
    getServerTypesResponse,
    getServerTypeResponse,
    createServerTypeResponse,
    updateServerTypeResponse,
    deleteServerTypeResponse
};