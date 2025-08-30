'use strict'

const BaseService = require('../../../services/BaseService');

/**
 * Votifier Service
 * Handles votifier configuration operations
 */
class VotifierService extends BaseService {
    constructor(votifierRepository, logger) {
        super(votifierRepository, logger);
        this.votifierRepository = votifierRepository;
    }

    /**
     * Get votifier config by server ID
     * @param {number} serverId - Server ID
     * @returns {Promise<VotifierDTO|null>} Votifier config or null
     */
    async getVotifierByServerId(serverId) {
        try {
            return await this.votifierRepository.findByServerId(serverId);
        } catch (error) {
            this.handleRepositoryError(error, 'get votifier by server ID');
        }
    }

    /**
     * Create new votifier config
     * @param {Object} votifierData - Votifier data
     * @returns {Promise<VotifierDTO>} Created votifier config
     */
    async createVotifier(votifierData) {
        try {
            // Validate required fields
            if (!votifierData.server_id || !votifierData.host || !votifierData.port || !votifierData.token) {
                throw this.createError('Missing required fields', 400, 'MISSING_REQUIRED_FIELDS');
            }

            // Check if votifier config already exists for this server
            const existingVotifier = await this.votifierRepository.findByServerId(votifierData.server_id);
            if (existingVotifier) {
                throw this.createError('Votifier configuration already exists for this server', 409, 'VOTIFIER_EXISTS');
            }

            const votifier = await this.votifierRepository.create(votifierData);

            this.log('info', {
                serverId: votifierData.server_id,
                votifierId: votifier.id
            }, 'Votifier configuration created successfully');

            return votifier;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.handleRepositoryError(error, 'create votifier config');
        }
    }

    /**
     * Update votifier config
     * @param {number} id - Votifier config ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<VotifierDTO>} Updated votifier config
     */
    async updateVotifier(id, updateData) {
        try {
            // Check if votifier config exists
            const existingVotifier = await this.votifierRepository.findById(id);
            if (!existingVotifier) {
                throw this.createError('Votifier configuration not found', 404, 'VOTIFIER_NOT_FOUND');
            }

            const updatedVotifier = await this.votifierRepository.update(id, updateData);

            this.log('info', {
                votifierId: id,
                updatedFields: Object.keys(updateData)
            }, 'Votifier configuration updated successfully');

            return updatedVotifier;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.handleRepositoryError(error, 'update votifier config');
        }
    }

    /**
     * Delete votifier config
     * @param {number} id - Votifier config ID
     * @returns {Promise<boolean>} Success status
     */
    async deleteVotifier(id) {
        try {
            // Check if votifier config exists
            const existingVotifier = await this.votifierRepository.findById(id);
            if (!existingVotifier) {
                throw this.createError('Votifier configuration not found', 404, 'VOTIFIER_NOT_FOUND');
            }

            const deleted = await this.votifierRepository.delete(id);

            this.log('info', {
                votifierId: id,
                serverId: existingVotifier.server_id
            }, 'Votifier configuration deleted successfully');

            return deleted;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.handleRepositoryError(error, 'delete votifier config');
        }
    }

    /**
     * Get votifier config by ID
     * @param {number} id - Votifier config ID
     * @returns {Promise<VotifierDTO|null>} Votifier config or null
     */
    async getVotifierById(id) {
        try {
            return await this.votifierRepository.findById(id);
        } catch (error) {
            this.handleRepositoryError(error, 'get votifier by ID');
        }
    }

    /**
     * Get all enabled votifier configs
     * @returns {Promise<VotifierDTO[]>} Array of enabled votifier configs
     */
    async getAllEnabledVotifiers() {
        try {
            return await this.votifierRepository.findAllEnabled();
        } catch (error) {
            this.handleRepositoryError(error, 'get all enabled votifiers');
        }
    }

    /**
     * Toggle votifier enabled status
     * @param {number} id - Votifier config ID
     * @returns {Promise<VotifierDTO>} Updated votifier config
     */
    async toggleVotifierStatus(id) {
        try {
            const existingVotifier = await this.votifierRepository.findById(id);
            if (!existingVotifier) {
                throw this.createError('Votifier configuration not found', 404, 'VOTIFIER_NOT_FOUND');
            }

            const updatedVotifier = await this.votifierRepository.update(id, {
                is_enabled: !existingVotifier.is_enabled
            });

            this.log('info', {
                votifierId: id,
                newStatus: updatedVotifier.is_enabled
            }, `Votifier configuration ${updatedVotifier.is_enabled ? 'enabled' : 'disabled'}`);

            return updatedVotifier;
        } catch (error) {
            if (error.statusCode) {
                throw error;
            }
            this.handleRepositoryError(error, 'toggle votifier status');
        }
    }
}

module.exports = VotifierService;