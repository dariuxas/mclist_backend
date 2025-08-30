'use strict'

const { createApiResponse, errorResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');
// Votifier configuration schema
const votifierConfigBody = {
    type: 'object',
    required: ['host', 'port', 'token'],
    properties: {
        host: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Votifier server hostname or IP address'
        },
        port: {
            type: 'integer',
            minimum: 1,
            maximum: 65535,
            description: 'Votifier server port'
        },
        token: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Votifier server token/key'
        },
        is_enabled: {
            type: 'boolean',
            default: true,
            description: 'Whether votifier is enabled for this server'
        }
    },
    additionalProperties: false
};

// Votifier update schema
const updateVotifierConfigBody = {
    type: 'object',
    properties: {
        host: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Votifier server hostname or IP address'
        },
        port: {
            type: 'integer',
            minimum: 1,
            maximum: 65535,
            description: 'Votifier server port'
        },
        token: {
            type: 'string',
            minLength: 1,
            maxLength: 255,
            description: 'Votifier server token/key'
        },
        is_enabled: {
            type: 'boolean',
            description: 'Whether votifier is enabled for this server'
        }
    },
    additionalProperties: false
};

// Votifier response schemas
const votifierObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        server_id: { type: 'integer' },
        host: { type: 'string' },
        port: { type: 'integer' },
        token: { type: 'string' },
        is_enabled: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
    }
};

const votifierPublicObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        server_id: { type: 'integer' },
        host: { type: 'string' },
        port: { type: 'integer' },
        is_enabled: { type: 'boolean' }
    }
};

const votifierConfigResponse = createApiResponse({
    type: 'object',
    properties: { votifier: votifierObject },
    required: ['votifier']
});

const votifierPublicResponse = createApiResponse({
    type: 'object',
    properties: { votifier: votifierPublicObject },
    required: ['votifier']
});

module.exports = {
    votifierConfigBody,
    updateVotifierConfigBody,
    votifierObject,
    votifierPublicObject,
    votifierConfigResponse,
    votifierPublicResponse
};