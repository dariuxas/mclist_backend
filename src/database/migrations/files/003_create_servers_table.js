'use strict'

module.exports = {
    async up(connection) {
        const createServersTable = `
            CREATE TABLE servers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                host VARCHAR(255) NOT NULL,
                port INTEGER NOT NULL DEFAULT 25565,
                version_id INTEGER REFERENCES minecraft_versions(id) ON DELETE SET NULL,
                max_players INTEGER DEFAULT 20,
                website VARCHAR(255),
                discord_invite VARCHAR(50),
                is_active BOOLEAN DEFAULT true,
                is_featured BOOLEAN DEFAULT false,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(host, port)
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_servers_host_port ON servers(host, port);
            CREATE INDEX idx_servers_active ON servers(is_active);
            CREATE INDEX idx_servers_featured ON servers(is_featured);
            CREATE INDEX idx_servers_created_by ON servers(created_by);
            CREATE INDEX idx_servers_website ON servers(website);
            CREATE INDEX idx_servers_discord ON servers(discord_invite);
            CREATE INDEX idx_servers_version_id ON servers(version_id);
        `;

        await connection.query(createServersTable);
        await connection.query(createIndexes);
        console.log('✅ Created servers table');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS servers');
        console.log('✅ Dropped servers table');
    }
};