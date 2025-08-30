'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Server Controller
 * Handles HTTP requests for server operations
 */
class ServerController extends BaseController {
    constructor(serverService, logger) {
        super(serverService, logger);
        this.serverService = serverService;
        this.bindMethods();
    }

    /**
     * Get all servers with filtering and pagination
     */
    async getServers(request, reply) {
        try {
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

            // Simple query validation
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            
            if (isNaN(pageNum) || pageNum < 1) {
                return reply.status(400).send({
                    success: false,
                    message: 'Puslapio numeris turi būti teisingas skaičius',
                    data: null,
                    errors: { page: 'Puslapio numeris turi būti teisingas skaičius' },
                    errorCode: 'VALIDATION_ERROR',
                    meta: {
                        timestamp: new Date().toISOString(),
                        requestId: request.id,
                        language: 'lt'
                    }
                });
            }

            if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
                return reply.status(400).send({
                    success: false,
                    message: 'Elementų kiekis turi būti skaičius nuo 1 iki 50',
                    data: null,
                    errors: { limit: 'Elementų kiekis turi būti skaičius nuo 1 iki 50' },
                    errorCode: 'VALIDATION_ERROR',
                    meta: {
                        timestamp: new Date().toISOString(),
                        requestId: request.id,
                        language: 'lt'
                    }
                });
            }

            const options = {
                page: pageNum,
                limit: limitNum,
                server_type_ids: server_type_ids || null,
                is_active: is_active !== undefined ? is_active === 'true' : null,
                is_premium: is_premium !== undefined ? is_premium === 'true' : null,
                search: search || null,
                include_offline: include_offline === 'true',
                sort_by: sort_by || 'created_at',
                sort_order: sort_order || 'desc',
                version: version || null,
                min_players: min_players ? parseInt(min_players) : null,
                max_players: max_players ? parseInt(max_players) : null,
                owned_by: request.query?.owned === 'true' ? request.user?.id ?? null : null
            };

            const isAdmin = request.user?.role === 'admin';
            const result = await this.serverService.getServers(options, isAdmin);

            // Map service result to schema-compliant shape
            const currentPage = Number.isFinite(result.page) ? result.page : parseInt(page) || 1;
            const perPage = Number.isFinite(result.limit) ? result.limit : parseInt(limit) || 10;
            const totalItems = Number.isFinite(result.total) ? result.total : 0;
            const totalPages = Number.isFinite(result.pages) ? result.pages : Math.ceil(totalItems / Math.max(perPage, 1));

            const responseData = {
                servers: (result.data || []).map(server =>
                    isAdmin ? server.toAdminJSON() : server.toPublicJSON()
                ),
                pagination: {
                    page: currentPage,
                    limit: perPage,
                    total: totalItems,
                    totalPages,
                    hasNext: currentPage < totalPages,
                    hasPrev: currentPage > 1
                }
            };

            return this.sendSuccess(
                reply,
                responseData,
                'Serveriai sėkmingai gauti',
                {},
                request,
                'get servers'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get servers');
        }
    }

    /**
     * Get servers owned by authenticated user with filtering and pagination
     */
    async getOwnedServers(request, reply) {
        try {
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
                server_type_ids: server_type_ids || null,
                is_active: is_active !== undefined ? is_active === 'true' : null,
                is_premium: is_premium !== undefined ? is_premium === 'true' : null,
                search: search || null,
                include_offline: include_offline === 'true',
                sort_by: sort_by || 'created_at',
                sort_order: sort_order || 'desc',
                version: version || null,
                min_players: min_players ? parseInt(min_players) : null,
                max_players: max_players ? parseInt(max_players) : null,
                owned_by: request.user?.id
            };

            const isAdmin = request.user?.role === 'admin';
            const result = await this.serverService.getServers(options, isAdmin);

            const responseData = {
                ...result,
                servers: (result.data || []).map(server =>
                    isAdmin ? server.toAdminJSON() : server.toPublicJSON()
                )
            };

            return this.sendSuccess(
                reply,
                responseData,
                'Serveriai sėkmingai gauti',
                {},
                request,
                'get owned servers'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get owned servers');
        }
    }

    /**
     * Get server by ID
     */
    async getServerById(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const server = await this.serverService.getServerById(serverId);
            
            // Hide inactive servers from non-admin users
            const isAdmin = request.user?.role === 'admin';
            if (!isAdmin && !server.is_active) {
                return reply.apiError('Serveris nerastas', [], 404, 'SERVER_NOT_FOUND');
            }

            // Use public JSON for non-admin users
            const serverData = isAdmin ? server.toAdminJSON() : server.toPublicJSON();

            return this.sendSuccess(
                reply,
                { server: serverData },
                'Serveris sėkmingai gautas',
                {},
                request,
                'get server by id'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get server by id');
        }
    }

    /**
     * Get server by slug
     */
    async getServerBySlug(request, reply) {
        try {
            const slug = request.params.slug;
            
            const server = await this.serverService.getServerBySlug(slug);
            
            // Hide inactive servers from non-admin users
            const isAdmin = request.user?.role === 'admin';
            if (!isAdmin && !server.is_active) {
                return reply.apiError('Serveris nerastas', [], 404, 'SERVER_NOT_FOUND');
            }

            const serverData = isAdmin ? server.toAdminJSON() : server.toPublicDetailedJSON();

            return this.sendSuccess(
                reply,
                { server: serverData },
                'Serveris sėkmingai gautas',
                {},
                request,
                'get server by slug'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get server by slug');
        }
    }


    /**
     * Create new server - Now Clean and Simple
     */
    async createServer(request, reply) {
        try {
            const server = await this.serverService.createServer(request.body, request.user.id);

            return reply.status(201).send({
                success: true,
                message: 'Serveris sėkmingai sukurtas',
                data: { server: server.toPublicJSON() },
                meta: {
                    timestamp: new Date().toISOString(),
                    requestId: request.id,
                    language: 'lt'
                }
            });
        } catch (error) {
            // Let the global error handler deal with it
            throw error;
        }
    }

    /**
     * Update server
     */
    async updateServer(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const server = await this.serverService.updateServer(
                serverId,
                request.body,
                request.user.id,
                request.user.role
            );

            // Use admin JSON for admin users, public JSON for regular users (both include slug)
            const isAdmin = request.user?.role === 'admin';
            const serverData = isAdmin ? server.toAdminJSON() : server.toPublicJSON();
            
            return this.sendSuccess(
                reply,
                { server: serverData },
                'Serveris sėkmingai atnaujintas',
                {},
                request,
                'update server'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'update server');
        }
    }

    /**
     * Delete server
     */
    async deleteServer(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            await this.serverService.deleteServer(serverId, request.user.id, request.user.role);

            return this.sendSuccess(
                reply,
                {},
                'Serveris sėkmingai ištrintas',
                {},
                request,
                'delete server'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'delete server');
        }
    }

    /**
     * Ping server manually
     */
    async pingServer(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const pingResult = await this.serverService.pingServer(serverId);

            return this.sendSuccess(
                reply,
                { ping_result: pingResult },
                'Serveris sėkmingai patikrintas',
                {},
                request,
                'ping server'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'ping server');
        }
    }

    /**
     * Get server statistics
     */
    async getServerStats(request, reply) {
        try {
            const stats = await this.serverService.getServerStats();

            return this.sendSuccess(
                reply,
                { stats },
                'Serverio statistikos sėkmingai gautos',
                {},
                request,
                'get server stats'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get server stats');
        }
    }

    /**
     * Get detailed statistics for a specific server
     */
    async getServerStatsById(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const stats = await this.serverService.getServerStatsById(serverId);

            return this.sendSuccess(
                reply,
                { stats },
                'Serverio statistikos sėkmingai gautos',
                {},
                request,
                'get server stats by id'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get server stats by id');
        }
    }

    /**
     * Get top servers by player count
     */
    async getTopServers(request, reply) {
        try {
            const { limit = 10 } = request.query;
            const topServers = await this.serverService.getTopServers(Math.min(parseInt(limit), 50));

            return this.sendSuccess(
                reply,
                { servers: topServers },
                'Geriausi serveriai sėkmingai gauti',
                {},
                request,
                'get top servers'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get top servers');
        }
    }

    /**
     * Check if server is owned by authenticated user
     */
    async checkServerOwnership(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const isOwned = await this.serverService.checkServerOwnership(serverId, request.user.id);

            // If not owned, return Unauthorized as requested
            if (!isOwned) {
                return reply.apiError('Jūs nevaldote šio serverio', [], 401, 'NOT_OWNED');
            }

            // If owned, return success
            return this.sendSuccess(
                reply,
                { 
                    is_owned: true,
                    server_id: serverId
                },
                'Serveris priklauso vartotojui',
                {},
                request,
                'check server ownership'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'check server ownership');
        }
    }


    /**
     * Toggle server featured status (admin only)
     */
    async toggleFeatured(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const server = await this.serverService.toggleFeatured(serverId, request.user.id);

            return this.sendSuccess(
                reply,
                { server: server.toAdminJSON() },
                'Serverio išskirtinumo statusas sėkmingai atnaujintas',
                {},
                request,
                'toggle server featured'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'toggle server featured');
        }
    }
}

module.exports = ServerController;