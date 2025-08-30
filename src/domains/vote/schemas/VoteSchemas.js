'use strict'

const { createApiResponse, createPaginatedResponse } = require('../../../shared/schemas/components/BaseSchemaComponents');
const { createStringField } = require('../../../shared/schemas/components/ValidationSchemaComponents');

// Vote creation schema with Lithuanian validation
const createVoteBody = {
    type: 'object',
    required: ['username', 'recaptcha_token'],
    properties: {
        username: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: '^[a-zA-Z0-9_]{1,16}$',
            description: 'Minecraft username for voting'
        },
        recaptcha_token: {
            type: 'string',
            minLength: 1,
            maxLength: 5000,
            description: 'reCAPTCHA v3 token for bot protection'
        }
    },
    additionalProperties: false
};

// Vote object schema (public)
const voteObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        server_id: { type: 'integer' },
        username: { type: 'string' },
        votifier_sent: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        server: {
            type: ['object', 'null'],
            properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                host: { type: 'string' },
                port: { type: 'integer' }
            }
        }
    }
};

// Vote object schema (admin - includes sensitive data)
const adminVoteObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        server_id: { type: 'integer' },
        username: { type: 'string' },
        ip_address: { type: 'string' },
        user_agent: { type: ['string', 'null'] },
        headers: { type: 'object' },
        recaptcha_token: { type: ['string', 'null'] },
        recaptcha_score: { type: ['number', 'null'] },
        referrer: { type: ['string', 'null'] },
        verification_score: { type: 'integer' },
        ip_analysis: { type: 'object' },
        votifier_sent: { type: 'boolean' },
        votifier_response: { type: ['string', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        server: {
            type: ['object', 'null'],
            properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                host: { type: 'string' },
                port: { type: 'integer' }
            }
        }
    }
};

// Vote response schemas
const createVoteResponse = createApiResponse({
    type: 'object',
    properties: { vote: voteObject },
    required: ['vote']
});

const getVotesResponse = createPaginatedResponse(voteObject, 'votes');

const adminVoteResponse = createApiResponse({
    type: 'object',
    properties: { vote: adminVoteObject },
    required: ['vote']
});

const canVoteResponse = createApiResponse({
    type: 'object',
    properties: {
        can_vote: { type: 'boolean' },
        reason: { type: 'string' },
        next_vote_time: { type: ['string', 'null'], format: 'date-time' },

    },
    required: ['can_vote']
});

// Security validation response schema
const securityValidationResponse = createApiResponse({
    type: 'object',
    properties: {
        isValid: { type: 'boolean', description: 'Whether the request passes basic security checks' },
        canProceed: { type: 'boolean', description: 'Whether the user can proceed with voting' },
        sessionId: { type: 'string', description: 'Security session ID for vote submission' },
        riskScore: { type: 'number', minimum: 0, maximum: 100, description: 'Overall risk score (0-100)' },
        flags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of security flags detected'
        }
    },
    required: ['isValid', 'canProceed']
});

module.exports = {
    createVoteBody,
    voteObject,
    adminVoteObject,
    createVoteResponse,
    getVotesResponse,
    adminVoteResponse,
    canVoteResponse,
    securityValidationResponse
};