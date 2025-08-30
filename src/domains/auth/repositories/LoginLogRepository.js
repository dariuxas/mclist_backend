'use strict'

const BaseRepository = require('../../../repositories/BaseRepository');

/**
 * Login Log Repository
 * Handles login attempt tracking and security
 */
class LoginLogRepository extends BaseRepository {
    constructor(database) {
        super(database, 'login_logs');
    }

    /**
     * Log a login attempt
     */
    async logAttempt(logData) {
        const query = `
            INSERT INTO login_logs (
                email, user_id, ip_address, user_agent, 
                attempt_result, failure_reason
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `;

        const result = await this.db.query(query, [
            logData.email,
            logData.user_id || null,
            logData.ip_address,
            logData.user_agent || null,
            logData.attempt_result,
            logData.failure_reason || null
        ]);

        return result.rows[0];
    }

    /**
     * Get failed login attempts for email within time window
     */
    async getFailedAttempts(email, windowMinutes = 10) {
        const query = `
            SELECT COUNT(*) as count, MAX(created_at) as last_attempt
            FROM login_logs 
            WHERE email = $1 
            AND attempt_result IN ('invalid_credentials', 'recaptcha_failed')
            AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
        `;

        const result = await this.db.query(query, [email]);
        return {
            count: parseInt(result.rows[0].count),
            last_attempt: result.rows[0].last_attempt
        };
    }

    /**
     * Get failed login attempts for IP within time window
     */
    async getFailedAttemptsByIP(ipAddress, windowMinutes = 10) {
        const query = `
            SELECT COUNT(*) as count, MAX(created_at) as last_attempt
            FROM login_logs 
            WHERE ip_address = $1 
            AND attempt_result IN ('invalid_credentials', 'recaptcha_failed')
            AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
        `;

        const result = await this.db.query(query, [ipAddress]);
        return {
            count: parseInt(result.rows[0].count),
            last_attempt: result.rows[0].last_attempt
        };
    }

    /**
     * Check if account is currently locked
     */
    async isAccountLocked(email, lockoutDurationMinutes = 60) {
        const query = `
            SELECT created_at, failure_reason
            FROM login_logs 
            WHERE email = $1 
            AND attempt_result = 'account_locked'
            AND created_at > NOW() - INTERVAL '${lockoutDurationMinutes} minutes'
            ORDER BY created_at DESC
            LIMIT 1
        `;

        const result = await this.db.query(query, [email]);
        
        if (result.rows.length > 0) {
            const lockTime = result.rows[0].created_at;
            const unlockTime = new Date(lockTime.getTime() + (lockoutDurationMinutes * 60 * 1000));
            
            return {
                locked: true,
                locked_at: lockTime,
                unlock_at: unlockTime,
                reason: result.rows[0].failure_reason
            };
        }

        return { locked: false };
    }

    /**
     * Get login statistics for user
     */
    async getLoginStats(email, days = 30) {
        const query = `
            SELECT 
                attempt_result,
                COUNT(*) as count,
                MAX(created_at) as last_occurrence
            FROM login_logs 
            WHERE email = $1 
            AND created_at > NOW() - INTERVAL '${days} days'
            GROUP BY attempt_result
            ORDER BY count DESC
        `;

        const result = await this.db.query(query, [email]);
        return result.rows;
    }

    /**
     * Clean up old login logs (for maintenance)
     */
    async cleanupOldLogs(daysToKeep = 90) {
        const query = `
            DELETE FROM login_logs 
            WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
        `;

        const result = await this.db.query(query);
        return result.rowCount;
    }

    /**
     * Get recent login attempts for admin monitoring
     */
    async getRecentAttempts(limit = 100, offset = 0) {
        const query = `
            SELECT 
                ll.*,
                u.email as user_email,
                u.role as user_role
            FROM login_logs ll
            LEFT JOIN users u ON ll.user_id = u.id
            ORDER BY ll.created_at DESC
            LIMIT $1 OFFSET $2
        `;

        const result = await this.db.query(query, [limit, offset]);
        return result.rows;
    }

    /**
     * Get suspicious activity (multiple failed attempts from different IPs)
     */
    async getSuspiciousActivity(hours = 24) {
        const query = `
            SELECT 
                email,
                COUNT(DISTINCT ip_address) as unique_ips,
                COUNT(*) as total_attempts,
                array_agg(DISTINCT ip_address) as ip_addresses,
                MIN(created_at) as first_attempt,
                MAX(created_at) as last_attempt
            FROM login_logs 
            WHERE attempt_result IN ('invalid_credentials', 'recaptcha_failed')
            AND created_at > NOW() - INTERVAL '${hours} hours'
            GROUP BY email
            HAVING COUNT(DISTINCT ip_address) > 2 OR COUNT(*) > 10
            ORDER BY total_attempts DESC
        `;

        const result = await this.db.query(query);
        return result.rows;
    }
}

module.exports = LoginLogRepository;