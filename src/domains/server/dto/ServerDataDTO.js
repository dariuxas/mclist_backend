'use strict'

/**
 * Server Data DTO
 * Handles server ping data with JSONB structure
 */
class ServerDataDTO {
    constructor(serverDataData) {
        this.id = serverDataData.id;
        this.server_id = serverDataData.server_id;
        this.data = serverDataData.data;
        this.created_at = serverDataData.created_at;
    }

    static fromDatabase(row) {
        // Ensure data is parsed if it comes as a string
        const parsedData = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
        return new ServerDataDTO({
            id: row.id,
            server_id: row.server_id,
            data: parsedData,
            created_at: row.created_at
        });
    }

    toJSON() {
        return {
            id: this.id,
            server_id: this.server_id,
            data: this.data,
            created_at: this.created_at
        };
    }

    // Helper methods for backward compatibility
    isOnline() {
        return this.data?.online || false;
    }

    getOnlinePlayers() {
        return this.data?.players?.online || 0;
    }

    getMaxPlayers() {
        return this.data?.players?.max || 0;
    }

    getVersion() {
        return this.data?.version || null;
    }

    getMotd() {
        return this.data?.motd?.clean?.[0] || null;
    }

    getSoftware() {
        return this.data?.software || null;
    }

    getPingTime() {
        return this.data?.ping_time || null;
    }

    hasIcon() {
        return !!this.data?.icon;
    }

    getIcon() {
        return this.data?.icon || null;
    }
}

module.exports = ServerDataDTO;