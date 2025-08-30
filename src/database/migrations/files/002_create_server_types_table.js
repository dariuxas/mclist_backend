'use strict'

module.exports = {
    async up(connection) {
        const createServerTypesTable = `
            CREATE TABLE server_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                color VARCHAR(7) DEFAULT '#3498db',
                icon VARCHAR(50) DEFAULT 'server',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        const createIndexes = `
            CREATE INDEX idx_server_types_name ON server_types(name);
            CREATE INDEX idx_server_types_active ON server_types(is_active);
        `;

        const insertDefaultTypes = `
            INSERT INTO server_types (name, description, color, icon) VALUES
            ('survival', 'Classic Minecraft survival experience', '#8B4513', 'pickaxe'),
            ('creative', 'Creative building and exploration', '#FFD700', 'palette'),
            ('pvp', 'Player vs Player combat server', '#DC143C', 'sword'),
            ('minigames', 'Various mini-games and activities', '#9932CC', 'gamepad'),
            ('skyblock', 'Survival on a floating island', '#87CEEB', 'cloud'),
            ('factions', 'Team-based survival with claiming', '#FF6347', 'flag'),
            ('prison', 'Mining and ranking progression', '#696969', 'lock'),
            ('modded', 'Modded Minecraft experience', '#32CD32', 'cog')
        `;

        await connection.query(createServerTypesTable);
        await connection.query(createIndexes);
        await connection.query(insertDefaultTypes);
        console.log('✅ Created server_types table with default types');
    },

    async down(connection) {
        await connection.query('DROP TABLE IF EXISTS server_types');
        console.log('✅ Dropped server_types table');
    }
};