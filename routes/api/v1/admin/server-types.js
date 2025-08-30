'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const { 
    createApiResponse, 
    createPaginatedResponse, 
    combineQueries, 
    paginationQuery, 
    searchQuery,
    idParam,
    errorResponse 
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const {
    createServerTypeBody,
    updateServerTypeBody,
    serverTypeResponse
} = require('../../../../src/domains/server/schemas/ServerTypeSchemas');

module.exports = async function (fastify) {
    const serverTypeController = fastify.getService('serverTypeController');

    // Admin server type object (same as public but with admin context)
    const adminServerTypeObject = {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: ['string', 'null'] },
            color: { type: 'string' },
            icon: { type: 'string' },
            is_active: { type: 'boolean' },
            server_count: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
        }
    };

    // Get all server types (admin view)
    fastify.get('/', {
        schema: {
      tags: ['Admin - Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Get all server types (admin)',
            description: 'Get paginated list of server types with admin data',
            response: {
                200: createPaginatedResponse(adminServerTypeObject, 'server_types'),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: serverTypeController.getServerTypes.bind(serverTypeController)
    });

    // Create server type
    fastify.post('/', {
        schema: {
      tags: ['Admin - Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Create server type',
            description: 'Create a new server type',
            // Validation handled by service layer
            response: {
                201: createApiResponse({
                    type: 'object',
                    properties: {
                        server_type: adminServerTypeObject
                    }
                }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: serverTypeController.createServerType.bind(serverTypeController)
    });

    // Update server type
    fastify.put('/:id', {
        schema: {
      tags: ['Admin - Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Update server type',
            description: 'Update server type information',
            
            // Validation handled by service layer
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        server_type: adminServerTypeObject
                    }
                }),
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

    // Delete server type
    fastify.delete('/:id', {
        schema: {
      tags: ['Admin - Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Delete server type',
            description: 'Delete a server type and remove it from all servers that use it',
            
            response: {
                200: createApiResponse({ type: 'object' }),
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

    // Toggle server type active status
    fastify.post('/:id/toggle-active', {
        schema: {
      tags: ['Admin - Server Types'],
            security: [{ bearerAuth: [] }],
            summary: 'Toggle server type active status',
            description: 'Enable or disable a server type',
            
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        server_type: adminServerTypeObject
                    }
                }),
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const serverTypeId = parseInt(request.params.id);
            const serverTypeService = fastify.getService('serverTypeService');
            
            const serverType = await serverTypeService.serverTypeRepository.findById(serverTypeId);
            if (!serverType) {
                return reply.apiError('Server type not found', [], 404, 'SERVER_TYPE_NOT_FOUND');
            }

            const updatedServerType = await serverTypeService.serverTypeRepository.update(serverTypeId, {
                is_active: !serverType.is_active
            });

            return reply.apiSuccess({
                server_type: updatedServerType.toJSON()
            }, `Server type ${updatedServerType.is_active ? 'activated' : 'deactivated'} successfully`);
        }
    });

    fastify.log.info('🏷️  Admin server type routes registered');
};