'use strict'

/**
 * Server Aggregator
 * Combines data from multiple sources to build complete server profiles
 */
class ServerAggregator {
    constructor(serverRepository, serverTypeRepository, serverDataRepository, logger) {
        this.serverRepository = serverRepository;
        this.serverTypeRepository = serverTypeRepository;
        this.serverDataRepository = serverDataRepository;
        this.logger = logger;
    }

    /**
     * Get complete server profile by ID
     * @param {number} serverId - Server ID
     * @param {Object} options - Options for data inclusion
     * @returns {Promise<ServerDTO>} Complete server profile
     */
    async getServerProfile(serverId, options = {}) {
        const {
            includeCreator = false,
            includeServerData = true,
            includeServerType = true
        } = options;

        try {
            // Get server with basic joins already handled by repository
            const server = await this.serverRepository.findById(serverId);
            if (!server) {
                throw new Error('Server not found');
            }

            return server;

        } catch (error) {
            this.logger.error({
                serverId,
                error: error.message,
                stack: error.stack
            }, 'Failed to aggregate server profile');
            throw error;
        }
    }

    /**
     * Get multiple server profiles
     * @param {Array<number>} serverIds - Array of server IDs
     * @param {Object} options - Options for data inclusion
     * @returns {Promise<Array<ServerDTO>>} Array of server profiles
     */
    async getServerProfiles(serverIds, options = {}) {
        try {
            const profiles = await Promise.all(
                serverIds.map(serverId => this.getServerProfile(serverId, options))
            );
            return profiles.filter(profile => profile !== null);
        } catch (error) {
            this.logger.error({
                serverIds,
                error: error.message
            }, 'Failed to get multiple server profiles');
            throw error;
        }
    }

    /**
     * Get servers with enhanced data for dashboard/listing
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated servers with enhanced data
     */
    async getEnhancedServerList(options = {}) {
        try {
            // Use repository's built-in pagination with joins
            const result = await this.serverRepository.getPaginated(options);

            // Additional processing could be done here if needed
            // For example, calculating additional metrics, formatting data, etc.

            return result;
        } catch (error) {
            this.logger.error({
                options,
                error: error.message
            }, 'Failed to get enhanced server list');
            throw error;
        }
    }

    /**
     * Get server statistics with additional calculations
     * @returns {Promise<Object>} Enhanced server statistics
     */
    async getEnhancedServerStats() {
        try {
            const baseStats = await this.serverDataRepository.getServerStats();
            
            // Add additional calculated metrics
            const onlinePercentage = baseStats.total_servers > 0 
                ? (baseStats.online_servers / baseStats.total_servers) * 100 
                : 0;

            return {
                ...baseStats,
                online_percentage: Math.round(onlinePercentage * 100) / 100,
                avg_players_per_server: baseStats.online_servers > 0 
                    ? Math.round((baseStats.total_players / baseStats.online_servers) * 100) / 100 
                    : 0
            };
        } catch (error) {
            this.logger.error({
                error: error.message
            }, 'Failed to get enhanced server stats');
            throw error;
        }
    }

    /**
     * Get server type statistics
     * @returns {Promise<Array>} Server types with statistics
     */
    async getServerTypeStats() {
        try {
            const serverTypes = await this.serverTypeRepository.findAll({
                is_active: true,
                include_server_count: true
            });

            // Could add additional calculations here
            return serverTypes.map(type => ({
                ...type.toJSON(),
                percentage: 0 // Could calculate percentage of total servers
            }));
        } catch (error) {
            this.logger.error({
                error: error.message
            }, 'Failed to get server type stats');
            throw error;
        }
    }
}

module.exports = ServerAggregator;