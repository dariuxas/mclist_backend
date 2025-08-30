'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');
const VoteDTO = require('../dto/VoteDTO');

/**
 * Vote Repository
 * Handles database operations for votes
 */
class VoteRepository extends BaseRepository {
    constructor(database) {
        super(database, 'server_votes');
    }

    /**
     * Create new vote
     * @param {Object} voteData - Vote data
     * @returns {Promise<VoteDTO>} Created vote
     */
    async create(voteData) {
        const query = `
            INSERT INTO server_votes (
                server_id, username, ip_address, user_agent, headers, 
                recaptcha_token, recaptcha_score, referrer, verification_score,
                ip_analysis, votifier_sent, votifier_response
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const values = [
            voteData.server_id,
            voteData.username,
            voteData.ip_address,
            voteData.user_agent,
            JSON.stringify(voteData.headers || {}),
            voteData.recaptcha_token,
            voteData.recaptcha_score,
            voteData.referrer,
            voteData.verification_score || 0,
            JSON.stringify(voteData.ip_analysis || {}),
            voteData.votifier_sent || false,
            voteData.votifier_response
        ];

        const result = await this.db.query(query, values);
        return VoteDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Find votes by server ID with pagination
     * @param {number} serverId - Server ID
     * @param {Object} options - Query options
     * @returns {Promise<VoteDTO[]>} Array of votes
     */
    async findByServerId(serverId, options = {}) {
        const { limit = 20, offset = 0, includeServer = false } = options;
        
        let query = `
            SELECT sv.*
            ${includeServer ? ', s.name as server_name, s.host as server_host, s.port as server_port' : ''}
            FROM server_votes sv
            ${includeServer ? 'JOIN servers s ON sv.server_id = s.id' : ''}
            WHERE sv.server_id = $1
            ORDER BY sv.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await this.db.query(query, [serverId, limit, offset]);
        return result.rows.map(row => VoteDTO.fromDatabase(row));
    }

    /**
     * Get votes with admin data (includes sensitive information)
     * @param {Object} options - Query options
     * @returns {Promise<VoteDTO[]>} Array of votes with admin data
     */
    async getVotesAdmin(options = {}) {
        const { 
            limit = 20, 
            offset = 0, 
            server_id, 
            votifier_sent, 
            username, 
            start_date, 
            end_date 
        } = options;

        let query = `
            SELECT sv.*, s.name as server_name, s.host as server_host, s.port as server_port
            FROM server_votes sv
            JOIN servers s ON sv.server_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        // Add filters
        if (server_id) {
            query += ` AND sv.server_id = $${paramCount}`;
            params.push(server_id);
            paramCount++;
        }

        if (votifier_sent !== null && votifier_sent !== undefined) {
            query += ` AND sv.votifier_sent = $${paramCount}`;
            params.push(votifier_sent);
            paramCount++;
        }

        if (username) {
            query += ` AND sv.username ILIKE $${paramCount}`;
            params.push(`%${username}%`);
            paramCount++;
        }

        if (start_date) {
            query += ` AND sv.created_at >= $${paramCount}`;
            params.push(start_date);
            paramCount++;
        }

        if (end_date) {
            query += ` AND sv.created_at <= $${paramCount}`;
            params.push(end_date);
            paramCount++;
        }

        query += ` ORDER BY sv.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await this.db.query(query, params);
        return result.rows.map(row => VoteDTO.fromDatabase(row));
    }

    /**
     * Count votes with admin filters
     * @param {Object} options - Query options
     * @returns {Promise<number>} Count of votes
     */
    async countVotesAdmin(options = {}) {
        const { 
            server_id, 
            votifier_sent, 
            username, 
            start_date, 
            end_date 
        } = options;

        let query = `
            SELECT COUNT(*) as count
            FROM server_votes sv
            JOIN servers s ON sv.server_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramCount = 1;

        // Add same filters as getVotesAdmin
        if (server_id) {
            query += ` AND sv.server_id = $${paramCount}`;
            params.push(server_id);
            paramCount++;
        }

        if (votifier_sent !== null && votifier_sent !== undefined) {
            query += ` AND sv.votifier_sent = $${paramCount}`;
            params.push(votifier_sent);
            paramCount++;
        }

        if (username) {
            query += ` AND sv.username ILIKE $${paramCount}`;
            params.push(`%${username}%`);
            paramCount++;
        }

        if (start_date) {
            query += ` AND sv.created_at >= $${paramCount}`;
            params.push(start_date);
            paramCount++;
        }

        if (end_date) {
            query += ` AND sv.created_at <= $${paramCount}`;
            params.push(end_date);
            paramCount++;
        }

        const result = await this.db.query(query, params);
        return parseInt(result.rows[0].count);
    }

    /**
     * Update vote
     * @param {number} id - Vote ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<VoteDTO>} Updated vote
     */
    async update(id, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 1;

        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined) {
                if (key === 'headers' || key === 'ip_analysis') {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(JSON.stringify(updateData[key]));
                } else {
                    fields.push(`${key} = $${paramCount}`);
                    values.push(updateData[key]);
                }
                paramCount++;
            }
        });

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        const query = `
            UPDATE server_votes 
            SET ${fields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await this.db.query(query, values);
        
        if (result.rows.length === 0) {
            throw new Error('Vote not found');
        }

        return VoteDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Find vote by ID
     * @param {number} id - Vote ID
     * @returns {Promise<VoteDTO|null>} Vote or null
     */
    async findById(id) {
        const query = `
            SELECT sv.*, s.name as server_name, s.host as server_host, s.port as server_port
            FROM server_votes sv
            JOIN servers s ON sv.server_id = s.id
            WHERE sv.id = $1
        `;
        const result = await this.db.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }

        return VoteDTO.fromDatabase(result.rows[0]);
    }

    /**
     * Delete vote by ID
     * @param {number} id - Vote ID
     * @returns {Promise<boolean>} Success status
     */
    async delete(id) {
        const query = 'DELETE FROM server_votes WHERE id = $1';
        const result = await this.db.query(query, [id]);
        return result.rowCount > 0;
    }

    /**
     * Count all votes
     * @returns {Promise<number>} total count
     */
    async countTotal() {
        const query = 'SELECT COUNT(*) as count FROM server_votes';
        const result = await this.db.query(query);
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Count votes created within the last N days
     * @param {number} days
     * @returns {Promise<number>} count
     */
    async countSinceDays(days = 7) {
        const query = `
            SELECT COUNT(*) as count
            FROM server_votes
            WHERE created_at >= NOW() - INTERVAL '${days} days'
        `;
        const result = await this.db.query(query);
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Get top voters by username for a server
     * @param {number} serverId - Server ID
     * @param {number} limit - Max number of usernames to return
     * @returns {Promise<Array<{ username: string, vote_count: number }>>}
     */
    async getTopVotersByServer(serverId, limit = 10) {
        const query = `
            SELECT username, COUNT(*)::int AS vote_count
            FROM server_votes
            WHERE server_id = $1
            GROUP BY username
            ORDER BY vote_count DESC, username ASC
            LIMIT $2
        `;
        const result = await this.db.query(query, [serverId, limit]);
        return result.rows.map(r => ({ username: r.username, vote_count: parseInt(r.vote_count, 10) }));
    }
}

module.exports = VoteRepository;