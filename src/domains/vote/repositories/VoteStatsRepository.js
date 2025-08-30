'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');

/**
 * Vote Stats Repository
 * Handles database operations for vote statistics
 */
class VoteStatsRepository extends BaseRepository {
    constructor(database) {
        super(database, 'server_vote_stats');
    }

    /**
     * Find vote stats by server ID
     * @param {number} serverId - Server ID
     * @returns {Promise<Object|null>} Vote stats or null
     */
    async findByServerId(serverId) {
        const query = 'SELECT * FROM server_vote_stats WHERE server_id = $1';
        const result = await this.db.query(query, [serverId]);
        
        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0];
    }

    /**
     * Create vote stats for server
     * @param {number} serverId - Server ID
     * @returns {Promise<Object>} Created vote stats
     */
    async createForServer(serverId) {
        const query = `
            INSERT INTO server_vote_stats (server_id, total_votes, daily_votes, weekly_votes, monthly_votes)
            VALUES ($1, 0, 0, 0, 0)
            RETURNING *
        `;
        const result = await this.db.query(query, [serverId]);
        return result.rows[0];
    }

    /**
     * Increment vote count
     * @param {number} serverId - Server ID
     * @returns {Promise<Object>} Updated vote stats
     */
    async incrementVoteCount(serverId) {
        const query = `
            UPDATE server_vote_stats 
            SET total_votes = total_votes + 1,
                daily_votes = daily_votes + 1,
                weekly_votes = weekly_votes + 1,
                monthly_votes = monthly_votes + 1,
                last_vote_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE server_id = $1 
            RETURNING *
        `;

        const result = await this.db.query(query, [serverId]);
        
        if (result.rows.length === 0) {
            // Create stats if they don't exist
            await this.createForServer(serverId);
            return this.incrementVoteCount(serverId);
        }

        return result.rows[0];
    }

    /**
     * Reset daily vote counts
     * @returns {Promise<number>} Number of updated records
     */
    async resetDailyVotes() {
        const query = `
            UPDATE server_vote_stats 
            SET daily_votes = 0, updated_at = CURRENT_TIMESTAMP
            WHERE daily_votes > 0
        `;
        const result = await this.db.query(query);
        return result.rowCount;
    }

    /**
     * Reset weekly vote counts
     * @returns {Promise<number>} Number of updated records
     */
    async resetWeeklyVotes() {
        const query = `
            UPDATE server_vote_stats 
            SET weekly_votes = 0, updated_at = CURRENT_TIMESTAMP
            WHERE weekly_votes > 0
        `;
        const result = await this.db.query(query);
        return result.rowCount;
    }

    /**
     * Reset monthly vote counts
     * @returns {Promise<number>} Number of updated records
     */
    async resetMonthlyVotes() {
        const query = `
            UPDATE server_vote_stats 
            SET monthly_votes = 0, updated_at = CURRENT_TIMESTAMP
            WHERE monthly_votes > 0
        `;
        const result = await this.db.query(query);
        return result.rowCount;
    }

    /**
     * Get vote analytics
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Vote analytics
     */
    async getVoteAnalytics(options = {}) {
        const { start_date, end_date } = options;

        // Get overall stats
        let statsQuery = `
            SELECT 
                COUNT(*) as total_votes,
                COUNT(CASE WHEN votifier_sent = true THEN 1 END) as votifier_sent_votes,
                COUNT(CASE WHEN votifier_sent = false THEN 1 END) as votifier_failed_votes
            FROM server_votes sv
            WHERE 1=1
        `;
        const statsParams = [];
        let paramCount = 1;

        if (start_date) {
            statsQuery += ` AND sv.created_at >= $${paramCount}`;
            statsParams.push(start_date);
            paramCount++;
        }

        if (end_date) {
            statsQuery += ` AND sv.created_at <= $${paramCount}`;
            statsParams.push(end_date);
            paramCount++;
        }

        const statsResult = await this.db.query(statsQuery, statsParams);
        const stats = statsResult.rows[0];

        // Calculate votifier success rate
        const totalVotifierAttempts = parseInt(stats.votifier_sent_votes) + parseInt(stats.votifier_failed_votes);
        const votifierSuccessRate = totalVotifierAttempts > 0 
            ? (parseInt(stats.votifier_sent_votes) / totalVotifierAttempts) * 100 
            : 0;

        // Get top servers by vote count
        let topServersQuery = `
            SELECT 
                s.id as server_id,
                s.name as server_name,
                COUNT(sv.id) as vote_count
            FROM servers s
            LEFT JOIN server_votes sv ON s.id = sv.server_id
        `;

        if (start_date || end_date) {
            topServersQuery += ' WHERE 1=1';
            if (start_date) {
                topServersQuery += ` AND (sv.created_at IS NULL OR sv.created_at >= $${paramCount})`;
                statsParams.push(start_date);
                paramCount++;
            }
            if (end_date) {
                topServersQuery += ` AND (sv.created_at IS NULL OR sv.created_at <= $${paramCount})`;
                statsParams.push(end_date);
                paramCount++;
            }
        }

        topServersQuery += `
            GROUP BY s.id, s.name
            ORDER BY vote_count DESC
            LIMIT 10
        `;

        const topServersResult = await this.db.query(topServersQuery, statsParams);

        // Get votes by day for the last 30 days
        const votesByDayQuery = `
            SELECT 
                DATE(sv.created_at) as date,
                COUNT(*) as count
            FROM server_votes sv
            WHERE sv.created_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE(sv.created_at)
            ORDER BY date DESC
        `;

        const votesByDayResult = await this.db.query(votesByDayQuery);

        return {
            total_votes: parseInt(stats.total_votes),
            votifier_success_rate: Math.round(votifierSuccessRate * 100) / 100,
            top_servers: topServersResult.rows.map(row => ({
                server_id: row.server_id,
                server_name: row.server_name,
                vote_count: parseInt(row.vote_count)
            })),
            votes_by_day: votesByDayResult.rows.map(row => ({
                date: row.date,
                count: parseInt(row.count)
            }))
        };
    }
}

module.exports = VoteStatsRepository;