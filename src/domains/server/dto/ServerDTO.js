'use strict'

/**
 * Server Data Transfer Object
 * Standardizes server data structure across the application
 */
class ServerDTO {
    constructor(serverData, options = {}) {
        this.id = serverData.id;
        this.name = serverData.name;
        this.description = serverData.description;
        this.host = serverData.host;
        this.port = serverData.port;
        this.server_type_ids = serverData.server_type_ids || [];
        this.version = serverData.version;
        this.version_id = serverData.version_id;
        this.max_players = serverData.max_players;
        this.website = serverData.website;
        this.discord_invite = serverData.discord_invite;
        this.is_active = serverData.is_active;
        this.is_premium = !!serverData.is_premium;
        this.premium_until = serverData.premium_until || null;
        this.created_by = serverData.created_by;
        this.created_at = serverData.created_at;
        this.updated_at = serverData.updated_at;
        this.slug = serverData.slug;

        // Include server types info if available
        if (serverData.server_types) {
            this.server_types = serverData.server_types;
        }

        // Include server data if available
        if (serverData.server_data) {
            this.server_data = serverData.server_data;
        }

        // Include vote stats if available
        if (serverData.vote_stats) {
            this.vote_stats = serverData.vote_stats;
        }

        // Include SEO data if available
        if (serverData.seo_data) {
            this.seo_data = serverData.seo_data;
        }

        // Include creator info if available and requested
        if (options.includeCreator && serverData.creator) {
            this.creator = {
                id: serverData.creator.id,
                email: serverData.creator.email
            };
        }

    }

    /**
     * Create DTO from database row
     */
    static fromDatabase(row, serverTypes = []) {
        return new ServerDTO({
            id: row.id,
            name: row.name,
            description: row.description,
            host: row.host,
            port: row.port,
            server_type_ids: (serverTypes || []).map(st => st.id),
            version: row.version,
            version_id: row.version_id,
            max_players: row.max_players,
            website: row.website,
            discord_invite: row.discord_invite,
            is_active: row.is_active,
            is_premium: (row.premium_pinned === true) || (row.premium_until ? new Date(row.premium_until) > new Date() : false),
            premium_until: row.premium_until || null,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_at: row.updated_at,
            slug: row.slug,
            // Include server types data if available
            server_types: (serverTypes && serverTypes.length > 0) ? serverTypes : undefined,
            server_data: row.data ? {
                online: row.data.online || false,
                players: row.data.players || { online: 0, max: row.max_players },
                version: row.data.version || null,
                motd: row.data.motd || null,
                software: row.data.software || null,
                icon: row.data.icon || null,
                ping_time: row.data.ping_time || null,
                last_updated: row.data_created_at || row.created_at
            } : undefined,
            vote_stats: row.vote_stats_id ? {
                id: row.vote_stats_id,
                server_id: row.id,
                total_votes: parseInt(row.total_votes) || 0,
                verified_votes: parseInt(row.verified_votes) || 0,
                flagged_votes: parseInt(row.flagged_votes) || 0,
                daily_votes: parseInt(row.daily_votes) || 0,
                weekly_votes: parseInt(row.weekly_votes) || 0,
                monthly_votes: parseInt(row.monthly_votes) || 0,
                last_vote_at: row.last_vote_at
            } : {
                id: null,
                server_id: row.id,
                total_votes: 0,
                verified_votes: 0,
                flagged_votes: 0,
                daily_votes: 0,
                weekly_votes: 0,
                monthly_votes: 0,
                last_vote_at: null
            },
            creator: row.creator_email ? {
                id: row.created_by,
                email: row.creator_email
            } : undefined,
            seo_data: row.seo_data || undefined,
        });
    }

    /**
     * Convert to database format for insert/update
     */
    toDatabase() {
        return {
            name: this.name,
            description: this.description,
            host: this.host,
            port: this.port,
            version_id: this.version_id,
            max_players: this.max_players,
            website: this.website,
            discord_invite: this.discord_invite,
            is_active: this.is_active,
            created_by: this.created_by
        };
    }

    /**
     * Convert to JSON for API responses
     */
    toJSON() {
        const json = {
            id: this.id,
            name: this.name,
            description: this.description,
            host: this.host,
            port: this.port,
            version: this.version,
            max_players: this.max_players,
            website: this.website,
            discord_invite: this.discord_invite,
            is_premium: !!this.is_premium,
            premium_until: this.premium_until,
            created_at: this.created_at,
            updated_at: this.updated_at,
            slug: this.slug
        };

        if (this.server_types) {
            json.server_types = this.server_types;
        }

        if (this.server_data) {
            json.server_data = {
                online: this.server_data.online,
                players: this.server_data.players,
                version: this.server_data.version,
                motd: this.server_data.motd,
                software: this.server_data.software,
                icon: this.server_data.icon,
                ping_time: this.server_data.ping_time,
                last_updated: this.server_data.last_updated
            };
        }

        if (this.vote_stats) {
            json.vote_stats = {
                total_votes: this.vote_stats.total_votes
            };
        }

        return json;
    }

    /**
     * Convert to JSON for public endpoints
     */
    toPublicDetailedJSON() {
        const json = {
            id: this.id,
            name: this.name,
            description: this.description,
            host: this.host,
            port: this.port,
            version: this.version,
            max_players: this.max_players,
            website: this.website,
            discord_invite: this.discord_invite,
            is_premium: !!this.is_premium,
            premium_until: this.premium_until,
            created_at: this.created_at,
            updated_at: this.updated_at,
            slug: this.slug
        };


        if (this.server_types) {
            json.server_types = this.server_types;
        }

        if (this.server_data) {
            json.server_data = {
                online: this.server_data.online,
                players: this.server_data.players,
                version: this.server_data.version,
                motd: this.server_data.motd,
                software: this.server_data.software,
                icon: this.server_data.icon,
                ping_time: this.server_data.ping_time,
                last_updated: this.server_data.last_updated
            };
        }

        if (this.vote_stats) {
            json.vote_stats = {
                total_votes: this.vote_stats.total_votes
            };
        }

        if (this.seo_data) {
            json.seo_data = {
                ...this.seo_data,
                structured_data: this.seo_data.structured_data || {}
            };
        }

        return json;
    }

    /**
     * Convert to JSON for public API responses (excludes sensitive fields)
     */
    toPublicJSON() {
        const json = {
            id: this.id,
            name: this.name,
            description: this.description,
            host: this.host,
            port: this.port,
            version: this.version,
            max_players: this.max_players,
            // website and discord_invite hidden from public
            is_premium: !!this.is_premium,
            premium_until: this.premium_until,
            created_at: this.created_at,
            updated_at: this.updated_at,
            slug: this.slug
        };


        if (this.server_types) {
            json.server_types = this.server_types;
        }

        if (this.server_data) {
            json.server_data = {
                online: this.server_data.online,
                players: this.server_data.players,
                version: this.server_data.version,
                // motd hidden from public
                software: this.server_data.software,
                icon: this.server_data.icon,
                ping_time: this.server_data.ping_time,
                last_updated: this.server_data.last_updated,
            };
        }

        if (this.vote_stats) {
            json.vote_stats = {
                total_votes: this.vote_stats.total_votes
            };
        }

        return json;
    }

    /**
     * Convert to JSON for admin API responses (includes admin fields)
     */
    toAdminJSON() {
        const json = {
            id: this.id,
            name: this.name,
            description: this.description,
            host: this.host,
            port: this.port,
            server_type_ids: this.server_type_ids,
            version: this.version,
            max_players: this.max_players,
            website: this.website,
            discord_invite: this.discord_invite,
            is_active: this.is_active,
            is_premium: !!this.is_premium,
            premium_until: this.premium_until,
            created_by: this.created_by,
            created_at: this.created_at,
            updated_at: this.updated_at,
            slug: this.slug
        };


        if (this.server_types) {
            json.server_types = this.server_types;
        }

        if (this.server_data) {
            json.server_data = this.server_data;
        }

        if (this.vote_stats) {
            json.vote_stats = this.vote_stats;
        }

        if (this.creator) {
            json.creator = this.creator;
        }

        return json;
    }

    /**
     * Get server address as string
     */
    getAddress() {
        return this.port === 25565 ? this.host : `${this.host}:${this.port}`;
    }

    /**
     * Check if server is online based on server_data
     */
    isOnline() {
        return this.server_data?.online || false;
    }

    /**
     * Get current player count
     */
    getCurrentPlayers() {
        return this.server_data?.players?.online || 0;
    }

    /**
     * Check if server is owned by specific user
     */
    isOwnedBy(userId) {
        return this.created_by === userId;
    }
}

module.exports = ServerDTO;