'use strict'

const BaseRepository = require('../../shared/repositories/BaseRepository');
const UserProfileDTO = require('../dto/UserProfileDTO');

class UserRepository extends BaseRepository {
    constructor(database) {
        super(database, 'users');
    }

    async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rows.length > 0 ? UserProfileDTO.fromDatabase(result.rows[0]) : null;
    }

    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await this.db.query(query, [email]);
        return result.rows.length > 0 ? UserProfileDTO.fromDatabase(result.rows[0]) : null;
    }


    async create(userData) {
        // Hash password if provided
        let processedData = { ...userData };
        if (userData.password) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            processedData.password_hash = await bcrypt.hash(userData.password, saltRounds);
            delete processedData.password; // Remove plain password
        }

        const user = new UserProfileDTO(processedData, { includePrivateData: true });
        const data = user.toDatabase();

        // validate if role is valid
        const validRoles = ['user', 'admin'];
        if (data.role && !validRoles.includes(data.role)) {
            throw new Error(`Invalid role: ${data.role}. Valid roles are: ${validRoles.join(', ')}`);
        }

        const query = `
            INSERT INTO users (email, password_hash, role)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        const result = await this.db.query(query, [
            data.email,
            data.password_hash,
            data.role || 'user'
        ]);

        return this.findById(result.rows[0].id);
    }

    async update(id, userData) {
        const user = new UserProfileDTO(userData);
        const data = user.toDatabase();

        const fields = [];
        const values = [];

        let paramIndex = 1;
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null && key !== 'id') {
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
            UPDATE users
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
        `;

        await this.db.query(query, values);
        return this.findById(id);
    }

    async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT * FROM users
            ORDER BY created_at DESC
            LIMIT $1 OFFSET $2
        `;
        const result = await this.db.query(query, [limit, offset]);
        return result.rows.map(row => UserProfileDTO.fromDatabase(row));
    }

    async countTotal() {
        const query = 'SELECT COUNT(*) as count FROM users';
        const result = await this.db.query(query);
        return result.rows[0].count;
    }

    /**
     * Count users created within the last N days
     * @param {number} days - Number of days back from now (e.g., 7)
     * @returns {Promise<number>} count
     */
    async countNewSinceDays(days = 7) {
        const query = `
            SELECT COUNT(*) as count
            FROM users
            WHERE created_at >= NOW() - INTERVAL '${days} days'
        `;
        const result = await this.db.query(query);
        return parseInt(result.rows[0].count, 10);
    }

    async delete(id) {
        const query = 'DELETE FROM users WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    async findByIdWithFullProfile(id) {
        return this.findById(id);
    }


    async emailExists(email) {
        const query = 'SELECT COUNT(*) as count FROM users WHERE email = $1';
        const result = await this.db.query(query, [email]);
        return result.rows[0].count > 0;
    }

    /**
     * Get paginated users with filtering for admin
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Paginated users with metadata
     */
    async getPaginated(options = {}) {
        const {
            page = 1,
            limit = 10,
            role = null,
            search = null
        } = options;

        const offset = (page - 1) * limit;
        let whereConditions = [];
        let params = [];

        let paramIndex = 1;
        
        // Add role filter
        if (role) {
            whereConditions.push(`role = $${paramIndex}`);
            params.push(role);
            paramIndex++;
        }

        // Add search filter (email only)
        if (search) {
            whereConditions.push(`email ILIKE $${paramIndex}`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        // Get users
        const usersQuery = `
            SELECT
                id, email, role, created_at, updated_at
            FROM users
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users
            ${whereClause}
        `;

        try {
            const usersResult = await this.db.query(usersQuery, [...params, limit, offset]);
            const countResult = await this.db.query(countQuery, params);
            const total = countResult.rows[0].total;

            return {
                users: usersResult.rows,
                pagination: {
                    page: page,
                    limit: limit,
                    total: total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Failed to get paginated users: ${error.message}`);
        }
    }

    /**
     * Get users for admin view using limit/offset and optional filters
     * @param {Object} options
     * @param {number} options.limit
     * @param {number} options.offset
     * @param {string|null} options.role
     * @param {string|null} options.search
     * @returns {Promise<Array>} users rows
     */
    async getUsersAdmin(options = {}) {
        const {
            limit = 10,
            offset = 0,
            role = null,
            search = null
        } = options;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (role) {
            whereConditions.push(`u.role = $${paramIndex}`);
            params.push(role);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`u.email ILIKE $${paramIndex}`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const usersQuery = `
            SELECT 
                u.id, 
                u.email, 
                u.role, 
                u.created_at, 
                u.updated_at,
                COALESCE(server_counts.server_count, 0) as server_count,
                0 as vote_count
            FROM users u
            LEFT JOIN (
                SELECT created_by, COUNT(*) as server_count
                FROM servers
                WHERE is_active = true
                GROUP BY created_by
            ) server_counts ON u.id = server_counts.created_by
            ${whereClause}
            ORDER BY u.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        const result = await this.db.query(usersQuery, [...params, limit, offset]);
        return result.rows;
    }

    /**
     * Count users for admin view with optional filters
     * @param {Object} options
     * @param {string|null} options.role
     * @param {string|null} options.search
     * @returns {Promise<number>} total count
     */
    async countUsersAdmin(options = {}) {
        const { role = null, search = null } = options;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (role) {
            whereConditions.push(`role = $${paramIndex}`);
            params.push(role);
            paramIndex++;
        }

        if (search) {
            whereConditions.push(`email ILIKE $${paramIndex}`);
            params.push(`%${search}%`);
            paramIndex++;
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const countQuery = `
            SELECT COUNT(*) as total
            FROM users
            ${whereClause}
        `;

        const result = await this.db.query(countQuery, params);
        return parseInt(result.rows[0].total, 10);
    }

    /**
     * Get server count for a specific user
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async getUserServerCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM servers
            WHERE created_by = $1 AND is_active = true
        `;
        const result = await this.db.query(query, [userId]);
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Get vote count for a specific user
     * Since votes are not tied to user accounts (only username/IP), return 0
     * @param {number} userId
     * @returns {Promise<number>}
     */
    async getUserVoteCount(userId) {
        // Votes in server_votes table use username/IP, not user_id
        // So user accounts don't have associated votes
        return 0;
    }

    // Removed getOnlineUsers since we removed online functionality
}

module.exports = UserRepository;
