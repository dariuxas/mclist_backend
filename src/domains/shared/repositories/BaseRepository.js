'use strict'

/**
 * Base Repository class providing common database operations
 * Implements the Repository pattern for data access abstraction
 */
class BaseRepository {
    constructor(database, tableName) {
        this.db = database;
        this.tableName = tableName;
    }

    /**
     * Find a record by ID
     * @param {number} id - Record ID
     * @returns {Promise<Object|null>} Record or null if not found
     */
    async findById(id) {
        const query = `SELECT * FROM ${this.tableName} WHERE id = ?`;
        try {
            const [rows] = await this.db.query(query, [id]);
            return rows[0] || null;
        } catch (error) {
            throw new Error(`Failed to find record by ID in ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Find records by criteria
     * @param {Object} criteria - Search criteria
     * @param {Object} options - Query options (limit, offset, orderBy)
     * @returns {Promise<Array>} Array of records
     */
    async findBy(criteria = {}, options = {}) {
        const { limit, offset, orderBy = 'id', order = 'ASC' } = options;
        
        let query = `SELECT * FROM ${this.tableName}`;
        const params = [];

        // Build WHERE clause
        if (Object.keys(criteria).length > 0) {
            const conditions = Object.keys(criteria).map(key => {
                params.push(criteria[key]);
                return `${key} = ?`;
            });
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Add ORDER BY
        query += ` ORDER BY ${orderBy} ${order}`;

        // Add LIMIT and OFFSET
        if (limit) {
            query += ` LIMIT ?`;
            params.push(limit);
            
            if (offset) {
                query += ` OFFSET ?`;
                params.push(offset);
            }
        }

        try {
            const [rows] = await this.db.query(query, params);
            return rows;
        } catch (error) {
            throw new Error(`Failed to find records in ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Create a new record
     * @param {Object} data - Record data
     * @returns {Promise<Object>} Created record with ID
     */
    async create(data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');

        const query = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

        try {
            const [result] = await this.db.query(query, values);
            return {
                id: result.insertId,
                ...data
            };
        } catch (error) {
            throw new Error(`Failed to create record in ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Update a record by ID
     * @param {number} id - Record ID
     * @param {Object} data - Updated data
     * @returns {Promise<boolean>} True if updated, false if not found
     */
    async update(id, data) {
        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map(field => `${field} = ?`).join(', ');

        const query = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
        values.push(id);

        try {
            const [result] = await this.db.query(query, values);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Failed to update record in ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Delete a record by ID
     * @param {number} id - Record ID
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    async delete(id) {
        const query = `DELETE FROM ${this.tableName} WHERE id = ?`;

        try {
            const [result] = await this.db.query(query, [id]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Failed to delete record from ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Count records by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<number>} Count of records
     */
    async count(criteria = {}) {
        let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];

        if (Object.keys(criteria).length > 0) {
            const conditions = Object.keys(criteria).map(key => {
                params.push(criteria[key]);
                return `${key} = ?`;
            });
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        try {
            const [rows] = await this.db.query(query, params);
            return rows[0].count;
        } catch (error) {
            throw new Error(`Failed to count records in ${this.tableName}: ${error.message}`);
        }
    }

    /**
     * Check if a record exists by criteria
     * @param {Object} criteria - Search criteria
     * @returns {Promise<boolean>} True if exists, false otherwise
     */
    async exists(criteria) {
        const count = await this.count(criteria);
        return count > 0;
    }
}

module.exports = BaseRepository;