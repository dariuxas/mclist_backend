'use strict'

const BaseRepository = require('../../shared/repositories/BaseRepository');

class MinecraftVersionRepository extends BaseRepository {
    constructor(database) {
        super(database, 'minecraft_versions');
    }

    async findByVersion(version) {
        const query = 'SELECT * FROM minecraft_versions WHERE version = $1';
        const result = await this.db.query(query, [version]);
        return result.rows[0] || null;
    }

    async getAllActive() {
        const query = `
            SELECT * FROM minecraft_versions 
            WHERE is_active = true 
            ORDER BY version DESC
        `;
        const result = await this.db.query(query);
        return result.rows;
    }

    async insertVersion(version) {
        const query = `
            INSERT INTO minecraft_versions (version) 
            VALUES ($1) 
            ON CONFLICT (version) DO UPDATE SET 
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await this.db.query(query, [version]);
        return result.rows[0];
    }

    async deactivateAll() {
        const query = 'UPDATE minecraft_versions SET is_active = false, updated_at = CURRENT_TIMESTAMP';
        await this.db.query(query);
    }

    async insertVersions(versions) {
        if (!versions || versions.length === 0) return [];

        const values = versions.map((version, index) => `($${index + 1})`).join(',');
        const query = `
            INSERT INTO minecraft_versions (version) 
            VALUES ${values}
            ON CONFLICT (version) DO UPDATE SET 
                is_active = true,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        
        const result = await this.db.query(query, versions);
        return result.rows;
    }
}

module.exports = MinecraftVersionRepository;