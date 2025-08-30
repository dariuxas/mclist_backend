'use strict'

/**
 * Votifier Data Transfer Object
 * Standardizes votifier configuration data structure
 */
class VotifierDTO {
    constructor(votifierData) {
        this.id = votifierData.id;
        this.server_id = votifierData.server_id;
        this.host = votifierData.host;
        this.port = votifierData.port;
        this.token = votifierData.token;
        this.is_enabled = votifierData.is_enabled;
        this.created_at = votifierData.created_at;
        this.updated_at = votifierData.updated_at;
    }

    /**
     * Create DTO from database row
     */
    static fromDatabase(row) {
        return new VotifierDTO({
            id: row.id,
            server_id: row.server_id,
            host: row.host,
            port: row.port,
            token: row.token,
            is_enabled: row.is_enabled,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    }

    /**
     * Convert to database format for insert/update
     */
    toDatabase() {
        return {
            server_id: this.server_id,
            host: this.host,
            port: this.port,
            token: this.token,
            is_enabled: this.is_enabled
        };
    }

    /**
     * Convert to JSON for API responses
     */
    toJSON() {
        return {
            id: this.id,
            server_id: this.server_id,
            host: this.host,
            port: this.port,
            token: this.token,
            is_enabled: this.is_enabled,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Convert to JSON for public API responses (without sensitive data)
     */
    toPublicJSON() {
        return {
            id: this.id,
            server_id: this.server_id,
            host: this.host,
            port: this.port,
            is_enabled: this.is_enabled
        };
    }
}

module.exports = VotifierDTO;