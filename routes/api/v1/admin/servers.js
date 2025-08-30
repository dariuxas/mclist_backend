'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const { 
    createApiResponse, 
    idParam,
    errorResponse 
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');
const { 
    detailedServerObject,
    getServersQuery,
    getServersResponse,
    deleteServerResponse,
    updateServerBody,
    updateServerResponse
} = require('../../../../src/domains/server/schemas/ServerSchemas');

module.exports = async function (fastify) {
    const serverService = fastify.getService('serverService');

    const premiumUpdateBody = {
        type: 'object',
        additionalProperties: false,
        properties: {
            pinned: { type: 'boolean' },
            premium_until: { type: ['string', 'null'], format: 'date-time' }
        }
    };

    const premiumResponse = createApiResponse({
        type: 'object',
        properties: {
            server: detailedServerObject
        }
    });

    // GET / - list all servers (admin)
    fastify.get('/', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'List servers (admin)',
            description: 'Get paginated list of all servers with filters. Returns admin view.',
            
            response: {
                200: getServersResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const {
                page = 1,
                limit = 10,
                server_type_ids,
                is_active,
                is_premium,
                search,
                include_offline = 'true',
                sort_by = 'created_at',
                sort_order = 'desc',
                version,
                min_players,
                max_players
            } = request.query;

            const options = {
                page: parseInt(page),
                limit: Math.min(parseInt(limit), 50),
                server_type_ids,
                is_active,
                is_premium,
                search,
                include_offline,
                sort_by,
                sort_order,
                version,
                min_players,
                max_players
            };

            const result = await serverService.getServers(options, true);

            const servers = (result.data || []).map(s => s.toAdminJSON());
            const pagination = {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.pages,
                hasNext: result.page < result.pages,
                hasPrev: result.page > 1
            };

            return reply.apiSuccess({ servers, pagination }, 'Servers retrieved successfully');
        }
    });

    // Grant or update premium (upsert pinned and/or premium_until)
    fastify.post('/:id/premium', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'Grant or update premium status for a server',
            description: 'Creates or updates premium status. If no row exists, it will be created with provided fields.',
            
            // Validation handled by service layer
            response: { 200: premiumResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const serverId = parseInt(request.params.id);
            const { pinned, premium_until } = request.body || {};
            const updated = await serverService.setPremium(serverId, { pinned, premium_until });
            return reply.apiSuccess({ server: updated.toAdminJSON() }, 'Premium updated');
        }
    });

    // Revoke premium (delete premium row)
    fastify.delete('/:id/premium', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'Revoke premium status from a server',
            
            response: { 200: premiumResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const serverId = parseInt(request.params.id);
            const updated = await serverService.clearPremium(serverId);
            return reply.apiSuccess({ server: updated.toAdminJSON() }, 'Premium revoked');
        }
    });

    // Toggle pinned state explicitly
    fastify.post('/:id/premium/pin', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'Set premium pinned state for a server',
            
            // Validation handled by service layer additionalProperties: false, properties: { pinned: { type: 'boolean' } },
      response: { 200: premiumResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const serverId = parseInt(request.params.id);
            const { pinned } = request.body;
            const updated = await serverService.setPremiumPinned(serverId, pinned);
            return reply.apiSuccess({ server: updated.toAdminJSON() }, 'Pinned state updated');
        }
    });

    // Update premium_until only
    fastify.post('/:id/premium/until', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'Set premium expiration (premium_until) for a server',
            
            // Validation handled by service layer additionalProperties: false, properties: { premium_until: { type: ['string', 'null'], format: 'date-time' } },
      response: { 200: premiumResponse, 400: errorResponse, 401: errorResponse, 403: errorResponse, 404: errorResponse, 500: errorResponse }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const serverId = parseInt(request.params.id);
            const { premium_until } = request.body;
            const updated = await serverService.setPremiumUntil(serverId, premium_until);
            return reply.apiSuccess({ server: updated.toAdminJSON() }, 'Premium expiration updated');
        }
    });

    // PUT /:id - update server (admin)
    fastify.put('/:id', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'Update server (admin)',
            description: 'Admin can update any server (owner checks bypassed)',
            
            // Validation handled by service layer
            response: {
                200: updateServerResponse,
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
            const serverId = parseInt(request.params.id);
            const updated = await serverService.updateServer(serverId, request.body, request.user.id, 'admin');
            return reply.apiSuccess({ server: updated.toAdminJSON() }, 'Server updated successfully');
        }
    });

    // DELETE /:id - delete server (admin)
    fastify.delete('/:id', {
        schema: {
      tags: ['Admin - Servers'],
            security: [{ bearerAuth: [] }],
            summary: 'Delete server (admin)',
            
            response: {
                200: deleteServerResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const serverId = parseInt(request.params.id);
            await serverService.deleteServer(serverId, request.user.id, 'admin');
            return reply.apiSuccess({}, 'Server deleted successfully');
        }
    });

    fastify.log.info('👑 Admin server premium routes registered');
};
