'use strict'

/**
 * Startup Service
 * Handles application startup tasks like initializing ping scheduler
 */
class StartupService {
    constructor(serverPingService, minecraftVersionService, logger) {
        this.serverPingService = serverPingService;
        this.minecraftVersionService = minecraftVersionService;
        this.logger = logger;
    }

    /**
     * Initialize all startup tasks
     */
    async initialize() {
        try {
            this.logger.info('🚀 Starting application initialization...');

            // Fetch and update Minecraft versions
            this.logger.info('📍 About to initialize Minecraft versions...');
            await this.initializeMinecraftVersions();
            this.logger.info('📍 Minecraft versions initialization completed');

            // Start the server ping scheduler
            this.logger.info('📍 About to initialize ping scheduler...');
            await this.initializePingScheduler();
            this.logger.info('📍 Ping scheduler initialization completed');

            this.logger.info('✅ Application initialization completed successfully');
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, '❌ Application initialization failed');
            throw error;
        }
    }

    /**
     * Initialize Minecraft versions
     */
    async initializeMinecraftVersions() {
        try {
            await this.minecraftVersionService.fetchAndUpdateVersions();
            this.logger.info('🎮 Minecraft versions initialized');
        } catch (error) {
            this.logger.error({ error: error.message }, 'Failed to initialize Minecraft versions');
            // Don't throw error - app should still start even if version fetching fails
        }
    }

    /**
     * Initialize the server ping scheduler
     */
    async initializePingScheduler() {
        try {
            // Start ping scheduler with 5-minute interval (matches API cache)
            this.logger.info('📍 Starting ping scheduler...');
            await this.serverPingService.startPingScheduler();
            this.logger.info('📡 Server ping scheduler initialized');

            // Run an immediate batch on startup to ensure fresh data is available right away
            this.logger.info('📍 About to run initial ping batch...');
            try {
                const result = await this.serverPingService.pingAllServers({ forceRefresh: true });
                this.logger.info({
                    pinged: result.pinged,
                    successful: result.successful,
                    failed: result.failed,
                    duration: result.duration
                }, '⚡ Initial server ping batch executed on startup');
            } catch (immediateErr) {
                this.logger.warn({ error: immediateErr.message, stack: immediateErr.stack }, 'Initial server ping batch failed');
            }
            this.logger.info('📍 Initial ping batch completed');
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, 'Failed to initialize ping scheduler');
            throw error;
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            this.logger.info('🛑 Starting graceful shutdown...');

            // Stop ping scheduler
            this.serverPingService.stopPingScheduler();

            this.logger.info('✅ Graceful shutdown completed');
        } catch (error) {
            this.logger.error({ error: error.message }, '❌ Error during shutdown');
        }
    }
}

module.exports = StartupService;