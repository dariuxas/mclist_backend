'use strict'

/**
 * Vote Data Transfer Object
 * Standardizes vote data structure across the application
 */
class VoteDTO {
    constructor(voteData) {
        this.id = voteData.id;
        this.server_id = voteData.server_id;
        this.username = voteData.username;
        this.ip_address = voteData.ip_address;
        this.user_agent = voteData.user_agent;
        this.headers = voteData.headers;
        this.recaptcha_token = voteData.recaptcha_token;
        this.recaptcha_score = voteData.recaptcha_score;
        this.referrer = voteData.referrer;
        this.verification_score = voteData.verification_score;
        this.ip_analysis = voteData.ip_analysis;
        this.votifier_sent = voteData.votifier_sent;
        this.votifier_response = voteData.votifier_response;
        this.created_at = voteData.created_at;
        this.updated_at = voteData.updated_at;

        // Include server info if available
        if (voteData.server) {
            this.server = voteData.server;
        }
    }

    /**
     * Create DTO from database row
     */
    static fromDatabase(row) {
        return new VoteDTO({
            id: row.id,
            server_id: row.server_id,
            username: row.username,
            ip_address: row.ip_address,
            user_agent: row.user_agent,
            headers: row.headers,
            recaptcha_token: row.recaptcha_token,
            recaptcha_score: row.recaptcha_score,
            referrer: row.referrer,
            verification_score: row.verification_score,
            ip_analysis: row.ip_analysis,
            votifier_sent: row.votifier_sent,
            votifier_response: row.votifier_response,
            created_at: row.created_at,
            updated_at: row.updated_at,
            server: row.server_name ? {
                id: row.server_id,
                name: row.server_name,
                host: row.server_host,
                port: row.server_port
            } : undefined
        });
    }

    /**
     * Convert to database format for insert/update
     */
    toDatabase() {
        return {
            server_id: this.server_id,
            username: this.username,
            ip_address: this.ip_address,
            user_agent: this.user_agent,
            headers: this.headers,
            recaptcha_token: this.recaptcha_token,
            recaptcha_score: this.recaptcha_score,
            referrer: this.referrer,
            verification_score: this.verification_score,
            ip_analysis: this.ip_analysis,
            votifier_sent: this.votifier_sent,
            votifier_response: this.votifier_response
        };
    }

    /**
     * Convert to JSON for API responses
     */
    toJSON() {
        return {
            id: this.id,
            server_id: this.server_id,
            username: this.username,
            votifier_sent: this.votifier_sent,
            created_at: this.created_at,
            updated_at: this.updated_at,
            server: this.server
        };
    }

    /**
     * Convert to JSON for public API responses (limited data)
     */
    toPublicJSON() {
        return {
            id: this.id,
            server_id: this.server_id,
            username: this.username,
            created_at: this.created_at,
            server: this.server
        };
    }

    /**
     * Convert to JSON for admin API responses (includes sensitive data)
     */
    toAdminJSON() {
        return {
            id: this.id,
            server_id: this.server_id,
            username: this.username,
            ip_address: this.ip_address,
            user_agent: this.user_agent,
            headers: this.headers,
            recaptcha_token: this.recaptcha_token,
            recaptcha_score: this.recaptcha_score,
            referrer: this.referrer,
            verification_score: this.verification_score,
            ip_analysis: this.ip_analysis,
            votifier_sent: this.votifier_sent,
            votifier_response: this.votifier_response,
            created_at: this.created_at,
            updated_at: this.updated_at,
            server: this.server
        };
    }
}

module.exports = VoteDTO;