'use strict'

const BaseRepository = require('./BaseRepository');

class SeoRepository extends BaseRepository {
    constructor(database) {
        super(database, 'server_seo');
    }

    async create(seoData) {
        const fields = Object.keys(seoData).join(', ');
        const placeholders = Object.keys(seoData).map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(seoData).map(value => 
            typeof value === 'object' && value !== null ? JSON.stringify(value) : value
        );

        const query = `INSERT INTO server_seo (${fields}) VALUES (${placeholders}) RETURNING *`;
        const result = await this.db.query(query, values);
        return result.rows[0];
    }

    async upsertByServerId(serverId, seoData) {
        try {
            const existing = await this.db.query('SELECT id FROM server_seo WHERE server_id = $1', [serverId]);
            
            if (existing.rows.length > 0) {
                const fields = Object.keys(seoData);
                const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');
                const values = [serverId, ...Object.values(seoData).map(value => 
                    typeof value === 'object' && value !== null ? JSON.stringify(value) : value
                )];

                const query = `UPDATE server_seo SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE server_id = $1 RETURNING *`;
                const result = await this.db.query(query, values);
                return result.rows[0];
            } else {
                return await this.create({ ...seoData, server_id: serverId });
            }
        } catch (error) {
            console.error('SEO Repository upsert error:', error);
            throw error;
        }
    }
}

module.exports = SeoRepository;
