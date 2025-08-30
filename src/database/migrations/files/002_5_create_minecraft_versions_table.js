'use strict'

module.exports = {
    async up(connection) {
        const createMinecraftVersionsTable = `
            CREATE TABLE minecraft_versions (
                id SERIAL PRIMARY KEY,
                version VARCHAR(20) NOT NULL UNIQUE,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_minecraft_versions_version ON minecraft_versions(version);
            CREATE INDEX idx_minecraft_versions_active ON minecraft_versions(is_active);
        `;

        await connection.query(createMinecraftVersionsTable);
        await connection.query(createIndexes);
        
        console.log('✅ Created minecraft_versions table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS minecraft_versions');
        console.log('✅ Dropped minecraft_versions table');
    }
};