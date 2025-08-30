'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const {
    createServerTypeBody,
    updateServerTypeBody,
    getServerTypesQuery,
    getServerTypesResponse,
    getServerTypeResponse,
    createServerTypeResponse,
    updateServerTypeResponse,
    deleteServerTypeResponse
} = require('../../../../src/domains/server/schemas/ServerTypeSchemas');
const { errorResponse } = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

module.exports = async function (fastify) {
    const serverTypeController = fastify.getService('serverTypeController');

    // Public endpoints
    fastify.get('/', {
        schema: {
      tags: ['Server Types'],
            summary: 'Get all server types',
            description: 'Get list of all server types with optional filtering',
            
            response: {
                200: getServerTypesResponse,
                400: errorResponse,
                500: errorResponse
            }
        },
        handler: serverTypeController.getServerTypes.bind(serverTypeController)
    });

    fastify.get('/:id', {
        schema: {
      tags: ['Server Types'],
            summary: 'Get server type by ID',
            description: 'Get detailed information about a specific server type',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', pattern: '^\\d+$' }
                },
                required: ['id']
            },
      response: {
                200: getServerTypeResponse,
                400: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        handler: serverTypeController.getServerTypeById.bind(serverTypeController)
    });

    // Admin only endpoints
    fastify.post('/', {
        schema: {
      tags: ['Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Create new server type',
            description: 'Create a new server type (admin only)',
            // Validation handled by service layer
            response: {
                201: createServerTypeResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: serverTypeController.createServerType.bind(serverTypeController)
    });

    fastify.put('/:id', {
        schema: {
      tags: ['Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Update server type',
            description: 'Update server type information (admin only)',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', pattern: '^\\d+$' }
                },
                required: ['id']
            },
            // Validation handled by service layer
            response: {
                200: updateServerTypeResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: serverTypeController.updateServerType.bind(serverTypeController)
    });

    fastify.delete('/:id', {
        schema: {
      tags: ['Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Delete server type',
            description: 'Delete server type (admin only)',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', pattern: '^\\d+$' }
                },
                required: ['id']
            },
      response: {
                200: deleteServerTypeResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: serverTypeController.deleteServerType.bind(serverTypeController)
    });

    fastify.post('/:id/toggle-active', {
        schema: {
      tags: ['Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Toggle server type active status',
            description: 'Toggle whether a server type is active (admin only)',
            params: {
                type: 'object',
                properties: {
                    id: { type: 'string', pattern: '^\\d+$' }
                },
                required: ['id']
            },
      response: {
                200: updateServerTypeResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: serverTypeController.toggleActive.bind(serverTypeController)
    });

    fastify.log.info('🏷️  Server type routes registered');
};