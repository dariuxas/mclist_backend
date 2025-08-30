'use strict'

module.exports = {
    async up(connection) {
        const createVotifierTable = `
            CREATE TABLE votifier_configs (
                id SERIAL PRIMARY KEY,
                server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
                host VARCHAR(255) NOT NULL,
                port INTEGER NOT NULL,
                token VARCHAR(255) NOT NULL,
                is_enabled BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(server_id)
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_votifier_configs_server_id ON votifier_configs(server_id);
            CREATE INDEX idx_votifier_configs_enabled ON votifier_configs(is_enabled);
        `;

        await connection.query(createVotifierTable);
        await connection.query(createIndexes);
        console.log('✅ Created votifier_configs table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS votifier_configs');
        console.log('✅ Dropped votifier_configs table');
    }
};