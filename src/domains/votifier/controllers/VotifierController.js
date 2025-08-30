'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Votifier Controller
 * Handles HTTP requests for votifier configurations
 */
class VotifierController extends BaseController {
    constructor(votifierService, logger) {
        super(votifierService, logger);
        this.votifierService = votifierService;
        this.bindMethods();
    }

    /**
     * Get votifier config for server (owner only)
     */
    async getServerVotifier(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            if (isNaN(serverId)) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }
            
            // Enforce ownership like other routes
            try {
                const serverService = request.server.getService('serverService');
                const isOwned = await serverService.checkServerOwnership(serverId, request.user.id);
                if (!isOwned) {
                    return reply.apiError('Jūs nevaldote šio serverio', [], 403, 'FORBIDDEN');
                }
            } catch (e) {
                // Propagate domain errors (e.g., server not found) to BaseController handler
                if (e && e.statusCode) throw e;
            }

            const votifier = await this.votifierService.getVotifierByServerId(serverId);
            if (!votifier) {
                return reply.apiError('Votifier konfigūracija nerasta', [], 404, 'VOTIFIER_NOT_FOUND');
            }

            return reply.success({
                votifier: votifier.toJSON()
            }, 'Votifier konfigūracija sėkmingai gauta');
        } catch (error) {
            return this.handleError(error, request, reply, 'get server votifier');
        }
    }

    /**
     * Create votifier config for server
     */
    async createServerVotifier(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            
            const votifierData = {
                server_id: serverId,
                ...request.body
            };

            const votifier = await this.votifierService.createVotifier(votifierData);

            return reply.status(201).success({
                votifier: votifier.toJSON()
            }, 'Votifier konfigūracija sėkmingai sukurta');
        } catch (error) {
            return this.handleError(error, request, reply, 'create server votifier');
        }
    }

    /**
     * Update votifier config for server
     */
    async updateServerVotifier(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            
            // Get existing votifier config
            const existingVotifier = await this.votifierService.getVotifierByServerId(serverId);
            if (!existingVotifier) {
                return reply.apiError('Votifier konfigūracija nerasta', [], 404, 'VOTIFIER_NOT_FOUND');
            }

            const updatedVotifier = await this.votifierService.updateVotifier(existingVotifier.id, request.body);

            return reply.success({
                votifier: updatedVotifier.toJSON()
            }, 'Votifier konfigūracija sėkmingai atnaujinta');
        } catch (error) {
            return this.handleError(error, request, reply, 'update server votifier');
        }
    }

    /**
     * Delete votifier config for server
     */
    async deleteServerVotifier(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            
            // Get existing votifier config
            const existingVotifier = await this.votifierService.getVotifierByServerId(serverId);
            if (!existingVotifier) {
                return reply.apiError('Votifier konfigūracija nerasta', [], 404, 'VOTIFIER_NOT_FOUND');
            }

            await this.votifierService.deleteVotifier(existingVotifier.id);

            return reply.success({}, 'Votifier konfigūracija sėkmingai ištrinta');
        } catch (error) {
            return this.handleError(error, request, reply, 'delete server votifier');
        }
    }

    /**
     * Toggle votifier status for server
     */
    async toggleServerVotifier(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            
            // Get existing votifier config
            const existingVotifier = await this.votifierService.getVotifierByServerId(serverId);
            if (!existingVotifier) {
                return reply.apiError('Votifier konfigūracija nerasta', [], 404, 'VOTIFIER_NOT_FOUND');
            }

            const updatedVotifier = await this.votifierService.toggleVotifierStatus(existingVotifier.id);

            return reply.success({
                votifier: updatedVotifier.toJSON()
            }, `Votifier konfigūracija ${updatedVotifier.is_enabled ? 'įjungta' : 'išjungta'} sėkmingai`);
        } catch (error) {
            return this.handleError(error, request, reply, 'toggle server votifier');
        }
    }
}

module.exports = VotifierController;