'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');
const ConfigDTO = require('../dto/ConfigDTO');

class ConfigRepository extends BaseRepository {
    constructor(database) {
        super(database, 'config');
    }

    /**
     * Find config by key
     */
    async findByKey(key) {
        const query = 'SELECT * FROM config WHERE key = $1';
        const result = await this.db.query(query, [key]);
        return result.rows.length > 0 ? ConfigDTO.fromDatabase(result.rows[0]) : null;
    }

    /**
     * Get all configs
     */
    async findAll(options = {}) {
        const { category = null, is_public = null } = options;
        
        let query = 'SELECT * FROM config WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND category = $${paramIndex}`;
            params.push(category);
            paramIndex++;
        }

        if (is_public !== null) {
            query += ` AND is_public = $${paramIndex}`;
            params.push(is_public);
            paramIndex++;
        }

        query += ' ORDER BY category, key';

        const result = await this.db.query(query, params);
        return result.rows.map(row => ConfigDTO.fromDatabase(row));
    }

    /**
     * Get configs by category
     */
    async findByCategory(category) {
        const query = 'SELECT * FROM config WHERE category = $1 ORDER BY key';
        const result = await this.db.query(query, [category]);
        return result.rows.map(row => ConfigDTO.fromDatabase(row));
    }

    /**
     * Get public configs only
     */
    async findPublic() {
        const query = 'SELECT * FROM config WHERE is_public = true ORDER BY category, key';
        const result = await this.db.query(query);
        return result.rows.map(row => ConfigDTO.fromDatabase(row));
    }

    /**
     * Create new config
     */
    async create(configData) {
        const config = new ConfigDTO(configData);
        const data = config.toDatabase();

        const query = `
            INSERT INTO config (key, value, type, description, category, is_public)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await this.db.query(query, [
            data.key,
            data.value,
            data.type,
            data.description,
            data.category,
            data.is_public
        ]);

        return ConfigDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Update config by key
     */
    async updateByKey(key, updateData) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        // Only allow updating certain fields
        const allowedFields = ['value', 'description', 'is_public'];
        
        Object.keys(updateData).forEach(field => {
            if (allowedFields.includes(field) && updateData[field] !== undefined) {
                fields.push(`${field} = $${paramIndex}`);
                values.push(updateData[field]);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(key); // This is for the WHERE clause

        const query = `
            UPDATE config 
            SET ${fields.join(', ')}
            WHERE key = $${paramIndex}
            RETURNING *
        `;

        const result = await this.db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Config not found');
        }

        return ConfigDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Delete config by key
     */
    async deleteByKey(key) {
        const query = 'DELETE FROM config WHERE key = $1';
        const result = await this.db.query(query, [key]);
        return result.rowCount > 0;
    }

    /**
     * Get config value by key (returns typed value)
     */
    async getValue(key, defaultValue = null) {
        const config = await this.findByKey(key);
        return config ? config.getTypedValue() : defaultValue;
    }

    /**
     * Set config value by key
     */
    async setValue(key, value) {
        const existing = await this.findByKey(key);
        
        if (existing) {
            existing.setTypedValue(value);
            return await this.updateByKey(key, { value: existing.value });
        } else {
            // Create new config with string type by default
            return await this.create({
                key,
                value: String(value),
                type: 'string',
                description: `Auto-created config for ${key}`,
                category: 'general',
                is_public: false
            });
        }
    }

    /**
     * Get all categories
     */
    async getCategories() {
        const query = 'SELECT DISTINCT category FROM config ORDER BY category';
        const result = await this.db.query(query);
        return result.rows.map(row => row.category);
    }

    /**
     * Bulk update configs
     */
    async bulkUpdate(updates) {
        const results = [];
        
        for (const update of updates) {
            try {
                const result = await this.updateByKey(update.key, { value: update.value });
                results.push({ key: update.key, success: true, config: result });
            } catch (error) {
                results.push({ key: update.key, success: false, error: error.message });
            }
        }
        
        return results;
    }
}

module.exports = ConfigRepository;