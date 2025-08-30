'use strict'

const { authenticate } = require('../../../../src/middleware/auth');
const { 
    votifierConfigBody,
    updateVotifierConfigBody,
    votifierConfigResponse,
    votifierPublicResponse
} = require('../../../../src/domains/votifier/schemas/VotifierSchemas');
const { 
    createApiResponse,
    idParam 
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    const votifierController = fastify.getService('votifierController');

    // Get votifier config for server (authenticated - server owner only)
    fastify.get('/servers/:id', {
        schema: {
      tags: ['Votifier'],
            security: [{ bearerAuth: [] }],
            summary: 'Get server votifier config',
            description: 'Get votifier configuration for a server (owner only)',
            
            response: {
                200: votifierConfigResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: votifierController.getServerVotifier.bind(votifierController)
    });

    // Create votifier config for server (authenticated - server owner only)
    fastify.post('/servers/:id', {
        schema: {
      tags: ['Votifier'],
            security: [{ bearerAuth: [] }],
            summary: 'Create votifier config',
            description: 'Create votifier configuration for a server',
            
            // Validation handled by service layer
            response: {
                201: votifierConfigResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: votifierController.createServerVotifier.bind(votifierController)
    });

    // Update votifier config (authenticated - server owner only)
    fastify.put('/servers/:id', {
        schema: {
      tags: ['Votifier'],
            security: [{ bearerAuth: [] }],
            summary: 'Update votifier config',
            description: 'Update votifier configuration for a server',
            
            // Validation handled by service layer
            response: {
                200: votifierConfigResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: votifierController.updateServerVotifier.bind(votifierController)
    });

    // Delete votifier config (authenticated - server owner only)
    fastify.delete('/servers/:id', {
        schema: {
      tags: ['Votifier'],
            security: [{ bearerAuth: [] }],
            summary: 'Delete votifier config',
            description: 'Delete votifier configuration for a server',
            
            response: {
                200: createApiResponse({ type: 'object' }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: votifierController.deleteServerVotifier.bind(votifierController)
    });

    // Toggle votifier status (authenticated - server owner only)
    fastify.post('/servers/:id/toggle', {
        schema: {
      tags: ['Votifier'],
            security: [{ bearerAuth: [] }],
            summary: 'Toggle votifier status',
            description: 'Enable or disable votifier configuration for a server',
            
            response: {
                200: votifierConfigResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate],
        handler: votifierController.toggleServerVotifier.bind(votifierController)
    });

    fastify.log.info('🗳️  Votifier routes registered');
};