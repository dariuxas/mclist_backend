'use strict'

module.exports = {
    async up(connection) {
        // Create junction table for many-to-many relationship between servers and server_types
        const createServerServerTypesTable = `
            CREATE TABLE server_server_types (
                id SERIAL PRIMARY KEY,
                server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
                server_type_id INTEGER NOT NULL REFERENCES server_types(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(server_id, server_type_id)
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_server_server_types_server ON server_server_types(server_id);
            CREATE INDEX idx_server_server_types_type ON server_server_types(server_type_id);
        `;

        await connection.query(createServerServerTypesTable);
        await connection.query(createIndexes);
        console.log('✅ Created server_server_types junction table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS server_server_types');
        console.log('✅ Dropped server_server_types table');
    }
};