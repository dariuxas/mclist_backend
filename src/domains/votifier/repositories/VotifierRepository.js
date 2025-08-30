'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');
const VotifierDTO = require('../dto/VotifierDTO');

/**
 * Votifier Repository
 * Handles database operations for votifier configurations
 */
class VotifierRepository extends BaseRepository {
    constructor(database) {
        super(database, 'votifier_configs');
    }

    /**
     * Find votifier config by server ID
     * @param {number} serverId - Server ID
     * @returns {Promise<VotifierDTO|null>} Votifier config or null
     */
    async findByServerId(serverId) {
        const query = `
            SELECT * FROM votifier_configs 
            WHERE server_id = $1
        `;
        const result = await this.db.query(query, [serverId]);
        
        if (result.rows.length === 0) {
            return null;
        }

        return VotifierDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Create new votifier config
     * @param {Object} votifierData - Votifier data
     * @returns {Promise<VotifierDTO>} Created votifier config
     */
    async create(votifierData) {
        const query = `
            INSERT INTO votifier_configs (server_id, host, port, token, is_enabled)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            votifierData.server_id,
            votifierData.host,
            votifierData.port,
            votifierData.token,
            votifierData.is_enabled !== undefined ? votifierData.is_enabled : true
        ];

        const result = await this.db.query(query, values);
        return VotifierDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Update votifier config
     * @param {number} id - Votifier config ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<VotifierDTO>} Updated votifier config
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        // Build dynamic update query
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                fields.push(`${key} = $${paramCount}`);
                values.push(updateData[key]);
                paramCount++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        // Add updated_at
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE votifier_configs 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await this.db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Votifier config not found');
        }

        return VotifierDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Delete votifier config
     * @param {number} id - Votifier config ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const query = 'DELETE FROM votifier_configs WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    /**
     * Find votifier config by ID
     * @param {number} id - Votifier config ID
     * @returns {Promise<VotifierDTO|null>} Votifier config or null
     */
    async findById(id) {
        const query = 'SELECT * FROM votifier_configs WHERE id = $1';
        const result = await this.db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        return VotifierDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Get all enabled votifier configs
     * @returns {Promise<VotifierDTO[]>} Array of enabled votifier configs
     */
    async findAllEnabled() {
        const query = `
            SELECT vc.*, s.name as server_name, s.host as server_host, s.port as server_port
            FROM votifier_configs vc
            JOIN servers s ON vc.server_id = s.id
            WHERE vc.is_enabled = true AND s.is_active = true
            ORDER BY vc.created_at DESC
        `;
        const result = await this.db.query(query);
        
        return result.rows.map(row => VotifierDTO.fromDatabase(row));
    }
}

module.exports = VotifierRepository;