'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Server Type Controller
 * Handles HTTP requests for server type operations
 */
class ServerTypeController extends BaseController {
    constructor(serverTypeService, logger) {
        super(serverTypeService, logger);
        this.serverTypeService = serverTypeService;
        this.bindMethods();
    }

    /**
     * Get all server types
     */
    async getServerTypes(request, reply) {
        try {
            const {
                page = 1,
                limit = 10,
                is_active,
                include_server_count = 'true'
            } = request.query;

            const options = {
                is_active: is_active !== undefined ? is_active === 'true' : null,
                include_server_count: include_server_count === 'true'
            };

            const serverTypes = await this.serverTypeService.getServerTypes(options);

            // For admin endpoint, create pagination metadata even though we return all results
            const total = serverTypes.length;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);

            return this.sendSuccess(
                reply,
                {
                    server_types: serverTypes.map(type => type.toJSON()),
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: total,
                        totalPages: Math.ceil(total / limitNum),
                        hasNext: pageNum * limitNum < total,
                        hasPrev: pageNum > 1
                    }
                },
                'Serverio tipai sėkmingai gauti',
                {},
                request,
                'get server types'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get server types');
        }
    }

    /**
     * Get server type by ID
     */
    async getServerTypeById(request, reply) {
        try {
            const typeId = parseInt(request.params.id);
            if (isNaN(typeId)) {
                return reply.apiError('Neteisingas serverio tipo ID', [], 400, 'INVALID_SERVER_TYPE_ID');
            }

            const serverType = await this.serverTypeService.getServerTypeById(typeId);

            return this.sendSuccess(
                reply,
                { server_type: serverType.toJSON() },
                'Serverio tipas sėkmingai gautas',
                {},
                request,
                'get server type by id'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get server type by id');
        }
    }

    /**
     * Create new server type (admin only)
     */
    async createServerType(request, reply) {
        try {
            const serverType = await this.serverTypeService.createServerType(request.body, request.user.id);

            return this.sendSuccess(
                reply,
                { server_type: serverType.toJSON() },
                'Serverio tipas sėkmingai sukurtas',
                {},
                request,
                'create server type',
                201
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'create server type');
        }
    }

    /**
     * Update server type (admin only)
     */
    async updateServerType(request, reply) {
        try {
            const typeId = parseInt(request.params.id);
            if (isNaN(typeId)) {
                return reply.apiError('Neteisingas serverio tipo ID', [], 400, 'INVALID_SERVER_TYPE_ID');
            }

            const serverType = await this.serverTypeService.updateServerType(typeId, request.body, request.user.id);

            return this.sendSuccess(
                reply,
                { server_type: serverType.toJSON() },
                'Serverio tipas sėkmingai atnaujintas',
                {},
                request,
                'update server type'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'update server type');
        }
    }

    /**
     * Delete server type (admin only)
     */
    async deleteServerType(request, reply) {
        try {
            const typeId = parseInt(request.params.id);
            if (isNaN(typeId)) {
                return reply.apiError('Neteisingas serverio tipo ID', [], 400, 'INVALID_SERVER_TYPE_ID');
            }

            await this.serverTypeService.deleteServerType(typeId, request.user.id);

            return this.sendSuccess(
                reply,
                {},
                'Serverio tipas sėkmingai ištrintas',
                {},
                request,
                'delete server type'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'delete server type');
        }
    }

    /**
     * Toggle server type active status (admin only)
     */
    async toggleActive(request, reply) {
        try {
            const typeId = parseInt(request.params.id);
            if (isNaN(typeId)) {
                return reply.apiError('Neteisingas serverio tipo ID', [], 400, 'INVALID_SERVER_TYPE_ID');
            }

            const serverType = await this.serverTypeService.toggleActive(typeId, request.user.id);

            return this.sendSuccess(
                reply,
                { server_type: serverType.toJSON() },
                'Serverio tipo statusas sėkmingai atnaujintas',
                {},
                request,
                'toggle server type active'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'toggle server type active');
        }
    }
}

module.exports = ServerTypeController;