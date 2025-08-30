'use strict'

const BaseRepository = require('../../shared/repositories/BaseRepository');
const ServerTypeDTO = require('../dto/ServerTypeDTO');

class ServerTypeRepository extends BaseRepository {
    constructor(database) {
        super(database, 'server_types');
    }

    async findById(id) {
        const query = `
            SELECT 
                st.*,
                COUNT(DISTINCT sst.server_id) as server_count
            FROM server_types st
            LEFT JOIN server_server_types sst ON st.id = sst.server_type_id
            LEFT JOIN servers s ON sst.server_id = s.id AND s.is_active = true
            WHERE st.id = $1
            GROUP BY st.id
        `;
        
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0 ? ServerTypeDTO.fromDatabase(result.rows[0]) : null;
    }

    async findAll(options = {}) {
        const {
            is_active = null,
            include_server_count = true
        } = options;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (is_active !== null) {
            whereConditions.push(`st.is_active = $${paramIndex}`);
            params.push(is_active);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = include_server_count ? `
            SELECT 
                st.*,
                COUNT(DISTINCT sst.server_id) as server_count
            FROM server_types st
            LEFT JOIN server_server_types sst ON st.id = sst.server_type_id
            LEFT JOIN servers s ON sst.server_id = s.id AND s.is_active = true
            ${whereClause}
            GROUP BY st.id
            ORDER BY st.name ASC
        ` : `
            SELECT st.*
            FROM server_types st
            ${whereClause}
            ORDER BY st.name ASC
        `;

        const result = await this.db.query(query, params);
        return result.rows.map(row => ServerTypeDTO.fromDatabase(row));
    }

    async create(serverTypeData) {
        const serverType = new ServerTypeDTO(serverTypeData);
        const data = serverType.toDatabase();

        const query = `
            INSERT INTO server_types (name, description, color, icon, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        `;

        const result = await this.db.query(query, [
            data.name,
            data.description,
            data.color,
            data.icon,
            data.is_active
        ]);

        return this.findById(result.rows[0].id);
    }

    async update(id, serverTypeData) {
        const serverType = new ServerTypeDTO(serverTypeData);
        const data = serverType.toDatabase();

        const fields = [];
        const values = [];
        let paramIndex = 1;

        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        values.push(id);

        const query = `
            UPDATE server_types
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
        `;

        await this.db.query(query, values);
        return this.findById(id);
    }

    async delete(id) {
        // Use transaction to ensure atomicity
        return await this.db.transaction(async (client) => {
            // First, remove all server-type relationships for this type
            await client.query('DELETE FROM server_server_types WHERE server_type_id = $1', [id]);
            
            // Then delete the server type itself
            const result = await client.query('DELETE FROM server_types WHERE id = $1', [id]);
            return result.rowCount > 0;
        });
    }

    async findByName(name) {
        const query = `
            SELECT 
                st.*,
                COUNT(DISTINCT sst.server_id) as server_count
            FROM server_types st
            LEFT JOIN server_server_types sst ON st.id = sst.server_type_id
            LEFT JOIN servers s ON sst.server_id = s.id AND s.is_active = true
            WHERE st.name = $1
            GROUP BY st.id
        `;
        
        const result = await this.db.query(query, [name]);
        return result.rows.length > 0 ? ServerTypeDTO.fromDatabase(result.rows[0]) : null;
    }

    async nameExists(name, excludeId = null) {
        let query = 'SELECT COUNT(*) as count FROM server_types WHERE name = $1';
        let params = [name];

        if (excludeId) {
            query += ' AND id != $2';
            params.push(excludeId);
        }

        const result = await this.db.query(query, params);
        return parseInt(result.rows[0].count) > 0;
    }
}

module.exports = ServerTypeRepository;