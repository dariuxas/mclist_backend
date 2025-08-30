'use strict'

/**
 * Base Repository
 * Provides common database operations
 */
class BaseRepository {
    constructor(database, tableName) {
        this.db = database;
        this.tableName = tableName;
    }

    /**
     * Find record by ID
     */
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Find all records
     */
    async findAll(limit = 100, offset = 0) {
        const query = `SELECT * FROM ${this.tableName} ORDER BY id LIMIT $1 OFFSET $2`;
        const result = await this.db.query(query, [limit, offset]);
        return result.rows;
    }

    /**
     * Count total records
     */
    async count(whereClause = '', params = []) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        if (whereClause) {
            query += ` WHERE ${whereClause}`;
        }
        
        const result = await this.db.query(query, params);
        return parseInt(result.rows[0].count);
    }

    /**
     * Delete record by ID
     */
    async delete(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    /**
     * Check if record exists
     */
    async exists(id) {
        const query = `SELECT 1 FROM ${this.tableName} WHERE id = $1 LIMIT 1`;
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0;
    }
}

module.exports = BaseRepository;