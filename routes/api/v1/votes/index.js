'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const {
    createVoteBody,
    createVoteResponse,
    getVotesResponse,
    adminVoteResponse,
    canVoteResponse
} = require('../../../../src/domains/vote/schemas/VoteSchemas');
const {
    paginationQuery,
    idParam
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    const voteController = fastify.getService('voteController');

    // Public endpoints
    fastify.post('/servers/:id(\\d+)', {
        schema: {
      tags: ['Votes'],
            summary: 'Vote for a server',
            description: 'Cast a vote for a server',
            
            // Validation handled by service layer
            response: {
                201: createVoteResponse,
                400: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        handler: voteController.createVote.bind(voteController)
    });

    // Get votes for server (authenticated - server owners and admins only)
    fastify.get('/servers/:id(\\d+)', {
        schema: {
      tags: ['Votes'],
            security: [{ bearerAuth: [] }],
            summary: 'Get server votes',
            description: 'Get vote information for a server (server owners and admins only)',
            
            
            response: {
                200: getVotesResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: voteController.getServerVotes.bind(voteController)
    });

    // Check if can vote for server
    fastify.get('/servers/:id(\\d+)/can-vote', {
        schema: {
      tags: ['Votes'],
            summary: 'Check if can vote for server',
            description: 'Check if the current IP can vote for a server today',
            
            response: {
                200: canVoteResponse,
                400: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        handler: voteController.canVoteForServer.bind(voteController)
    });

    // Admin only endpoints
    fastify.post('/votes/:voteId/flag', {
        schema: {
      tags: ['Votes'],
            security: [{ bearerAuth: [] }],
            summary: 'Flag a vote as suspicious',
            description: 'Flag a vote as potentially fraudulent (admin only)',
            params: {
                type: 'object',
                properties: {
                    voteId: { type: 'string', pattern: '^\\d+$' }
                },
                required: ['voteId']
            },
            body: {
                type: 'object',
                required: ['reason'],
                properties: {
                    reason: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 500,
                        description: 'Reason for flagging'
                    }
                }
            },
            response: {
                200: adminVoteResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: voteController.flagVote.bind(voteController)
    });

    fastify.post('/votes/:voteId/verify', {
        schema: {
      tags: ['Votes'],
            security: [{ bearerAuth: [] }],
            summary: 'Verify a vote',
            description: 'Mark a vote as verified/legitimate (admin only)',
            params: {
                type: 'object',
                properties: {
                    voteId: { type: 'string', pattern: '^\\d+$' }
                },
                required: ['voteId']
            },
      response: {
                200: adminVoteResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: voteController.verifyVote.bind(voteController)
    });

    fastify.log.info('🗳️  Vote routes registered');
};