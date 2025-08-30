'use strict'

const fp = require('fastify-plugin');
const MigrationManager = require('../src/database/migrations');

async function migrationPlugin(fastify, options) {
    try {
        fastify.log.info('🔄 Initializing database migrations...');

        // Create a proper database wrapper that includes both mysql and transaction
        const dbWrapper = {
            mysql: fastify.mysql,
            transaction: fastify.db.transaction,
            query: fastify.db.query
        };

        const migrationManager = new MigrationManager(dbWrapper, fastify.log);

        // Initialize migration system
        await migrationManager.initialize();

        // Run pending migrations
        await migrationManager.runMigrations();

        // Decorate fastify with migration manager for manual operations
        fastify.decorate('migrations', migrationManager);

        fastify.log.info('✅ Database migrations completed successfully');

    } catch (error) {
        fastify.log.error('❌ Migration system failed:', error);
        throw error;
    }
}

module.exports = fp(migrationPlugin, {
    name: 'migration',
    dependencies: ['database']
});