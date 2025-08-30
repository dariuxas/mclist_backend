'use strict'

module.exports = {
    async up(connection) {
        const createServerDataTable = `
            CREATE TABLE server_data (
                id SERIAL PRIMARY KEY,
                server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
                data JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await connection.query(createServerDataTable);
        
        // Create indexes separately
        await connection.query('CREATE INDEX idx_server_data_server_id ON server_data(server_id)');
        await connection.query('CREATE INDEX idx_server_data_online ON server_data((data->>\'online\'))');
        await connection.query('CREATE INDEX idx_server_data_created_at ON server_data(created_at)');
        console.log('✅ Created server_data table with JSONB structure');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS server_data');
        console.log('✅ Dropped server_data table');
    }
};