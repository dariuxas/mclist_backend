'use strict'

const fs = require('fs-extra');
const path = require('path');

class MigrationManager {
    constructor(database, logger) {
        this.db = database;
        this.logger = logger;
        this.migrationsDir = path.join(__dirname, 'files');
        this.migrationsTable = 'migrations';
    }

    async executeQuery(sql, params = []) {
        // Use our PostgreSQL db.query helper
        if (this.db.query) {
            return await this.db.query(sql, params);
        } else {
            // CLI fallback
            return await this.db.query(sql, params);
        }
    }

    async executeTransaction(callback) {
        return await this.db.transaction(callback);
    }

    async initialize() {
        try {
            // Create migrations table if it doesn't exist
            await this.createMigrationsTable();
            this.logger.info('✅ Migration system initialized');
        } catch (error) {
            this.logger.error('❌ Failed to initialize migration system:', error);
            throw error;
        }
    }

    async createMigrationsTable() {
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                batch INTEGER NOT NULL
            )
        `;

        const createIndexSQL = `
            CREATE INDEX IF NOT EXISTS idx_migrations_batch ON ${this.migrationsTable}(batch)
        `;

        await this.executeQuery(createTableSQL);
        await this.executeQuery(createIndexSQL);
        this.logger.debug('✅ Migrations table ready');
    }

    async getExecutedMigrations() {
        try {
            const result = await this.executeQuery(
                `SELECT filename FROM ${this.migrationsTable} ORDER BY executed_at ASC`
            );

            return result.rows.map(row => row.filename);
        } catch (error) {
            this.logger.error('Error getting executed migrations:', error);
            throw error;
        }
    }

    async getNextBatchNumber() {
        try {
            const result = await this.executeQuery(
                `SELECT MAX(batch) as max_batch FROM ${this.migrationsTable}`
            );

            const maxBatch = result.rows[0] ? (result.rows[0].max_batch || 0) : 0;
            return maxBatch + 1;
        } catch (error) {
            this.logger.error('Error getting batch number:', error);
            throw error;
        }
    }

    async getMigrationFiles() {
        try {
            const files = await fs.readdir(this.migrationsDir);
            return files
                .filter(file => file.endsWith('.js'))
                .sort();
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.ensureDir(this.migrationsDir);
                return [];
            }
            throw error;
        }
    }

    async runMigrations() {
        try {
            const migrationFiles = await this.getMigrationFiles();
            const executedMigrations = await this.getExecutedMigrations();
            const pendingMigrations = migrationFiles.filter(
                file => !executedMigrations.includes(file)
            );

            if (pendingMigrations.length === 0) {
                this.logger.info('📋 No pending migrations');
                return;
            }

            this.logger.info(`📋 Found ${pendingMigrations.length} pending migrations`);
            const batchNumber = await this.getNextBatchNumber();

            for (const filename of pendingMigrations) {
                await this.runSingleMigration(filename, batchNumber);
            }

            this.logger.info(`✅ Successfully executed ${pendingMigrations.length} migrations`);
        } catch (error) {
            this.logger.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async runSingleMigration(filename, batchNumber) {
        const migrationPath = path.join(this.migrationsDir, filename);

        try {
            this.logger.info(`🔄 Running migration: ${filename}`);

            // Clear require cache
            delete require.cache[require.resolve(migrationPath)];

            const migration = require(migrationPath);

            if (typeof migration.up !== 'function') {
                throw new Error(`Migration ${filename} must export an 'up' function`);
            }

            // Execute migration in a transaction
            await this.executeTransaction(async (connection) => {
                await migration.up(connection);

                // Record the migration as executed
                await connection.query(
                    `INSERT INTO ${this.migrationsTable} (filename, batch) VALUES ($1, $2)`,
                    [filename, batchNumber]
                );
            });

            this.logger.info(`✅ Migration completed: ${filename}`);
        } catch (error) {
            this.logger.error(`❌ Migration failed: ${filename}`, error);
            throw error;
        }
    }

    async rollback(steps = 1) {
        try {
            this.logger.debug(`Starting rollback of ${steps} steps...`);
            const result = await this.executeQuery(
                `SELECT DISTINCT batch FROM ${this.migrationsTable} ORDER BY batch DESC LIMIT $1`,
                [steps]
            );

            const batches = result.rows;

            if (batches.length === 0) {
                this.logger.info('📋 No migrations to rollback');
                return;
            }

            for (const batch of batches) {
                await this.rollbackBatch(batch.batch);
            }
        } catch (error) {
            this.logger.error('❌ Rollback failed:', error);
            throw error;
        }
    }

    async rollbackBatch(batchNumber) {
        try {
            this.logger.debug(`Rolling back batch ${batchNumber}...`);
            const result = await this.executeQuery(
                `SELECT filename FROM ${this.migrationsTable} WHERE batch = $1 ORDER BY executed_at DESC`,
                [batchNumber]
            );

            const migrations = result.rows;

            if (migrations.length === 0) {
                this.logger.info(`📋 No migrations found for batch ${batchNumber}`);
                return;
            }

            this.logger.info(`🔄 Rolling back batch ${batchNumber} (${migrations.length} migrations)`);

            for (const { filename } of migrations) {
                await this.rollbackSingleMigration(filename, batchNumber);
            }
        } catch (error) {
            this.logger.error(`❌ Rollback batch failed for batch ${batchNumber}:`, error);
            throw error;
        }
    }

    async rollbackSingleMigration(filename, batchNumber) {
        const migrationPath = path.join(this.migrationsDir, filename);

        try {
            this.logger.info(`🔄 Rolling back migration: ${filename}`);

            // Clear require cache
            delete require.cache[require.resolve(migrationPath)];

            const migration = require(migrationPath);

            if (typeof migration.down !== 'function') {
                this.logger.warn(`Migration ${filename} has no 'down' function, skipping rollback`);
                return;
            }

            await this.executeTransaction(async (connection) => {
                await migration.down(connection);

                // Remove the migration record
                await connection.query(
                    `DELETE FROM ${this.migrationsTable} WHERE filename = $1 AND batch = $2`,
                    [filename, batchNumber]
                );
            });

            this.logger.info(`✅ Rollback completed: ${filename}`);
        } catch (error) {
            this.logger.error(`❌ Rollback failed: ${filename}`, error);
            throw error;
        }
    }
}

module.exports = MigrationManager;