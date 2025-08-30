'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Vote Controller
 * Handles HTTP requests for vote operations
 */
class VoteController extends BaseController {
    constructor(voteService, logger) {
        super(voteService, logger);
        this.voteService = voteService;
        this.bindMethods();
    }

    /**
     * Create new vote
     */
    async createVote(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            
            // Validate server ID
            if (isNaN(serverId) || serverId <= 0) {
                return reply.apiError('Neteisingas serverio ID', [], 400, 'INVALID_SERVER_ID');
            }

            const voteData = {
                server_id: serverId,
                ...request.body,
                ip_address: request.ip,
                user_agent: request.headers['user-agent'],
                headers: request.headers
            };

            const vote = await this.voteService.createVote(voteData);

            return reply.status(201).success({
                vote: vote.toPublicJSON()
            }, 'Ačiū! Tavo balsas pridėtas!');
        } catch (error) {
            return this.handleError(error, request, reply, 'create vote');
        }
    }

    /**
     * Get votes for server (authenticated users only)
     */
    async getServerVotes(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            const { page, limit } = request.query;

            const result = await this.voteService.getServerVotes(serverId, {
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            }, request.user.id, request.user.role);

            // Use admin JSON for admins, owner JSON for server owners
            const isAdmin = request.user.role === 'admin';
            return reply.success({
                votes: result.votes.map(vote => isAdmin ? vote.toAdminJSON() : vote.toJSON()),
                pagination: result.pagination
            }, 'Balsai sėkmingai gauti');
        } catch (error) {
            return this.handleError(error, request, reply, 'get server votes');
        }
    }

    /**
     * Check if user can vote for server
     */
    async canVoteForServer(request, reply) {
        try {
            const serverId = parseInt(request.params.id);
            const ipAddress = request.ip;

            const result = await this.voteService.canVoteForServer(serverId, ipAddress);

            return reply.success(result, 'Balso galimybė sėkmingai patikrinta');
        } catch (error) {
            return this.handleError(error, request, reply, 'check can vote');
        }
    }

    /**
     * Flag vote as suspicious (admin only)
     */
    async flagVote(request, reply) {
        try {
            const voteId = parseInt(request.params.voteId);
            const { reason } = request.body;

            const vote = await this.voteService.flagVote(voteId, reason);

            return reply.success({
                vote: vote.toAdminJSON()
            }, 'Balsas sėkmingai pažymėtas kaip įtartinas');
        } catch (error) {
            return this.handleError(error, request, reply, 'flag vote');
        }
    }

    /**
     * Verify vote as legitimate (admin only)
     */
    async verifyVote(request, reply) {
        try {
            const voteId = parseInt(request.params.voteId);

            const vote = await this.voteService.verifyVote(voteId);

            return reply.success({
                vote: vote.toAdminJSON()
            }, 'Balsas sėkmingai patvirtintas');
        } catch (error) {
            return this.handleError(error, request, reply, 'verify vote');
        }
    }
}

module.exports = VoteController;