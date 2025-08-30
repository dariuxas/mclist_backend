'use strict'

/**
 * Admin Data Transfer Object
 * Standardizes admin-specific data structures
 */
class AdminDTO {
    /**
     * Create admin server DTO with full details
     */
    static createServerDTO(serverData) {
        return {
            id: serverData.id,
            name: serverData.name,
            description: serverData.description,
            host: serverData.host,
            port: serverData.port,
            server_type_ids: serverData.server_type_ids,
            version: serverData.version,
            max_players: serverData.max_players,
            website: serverData.website,
            discord_invite: serverData.discord_invite,
            is_active: serverData.is_active,
            is_premium: !!serverData.is_premium,
            premium_until: serverData.premium_until || null,
            created_by: serverData.created_by,
            created_at: serverData.created_at,
            updated_at: serverData.updated_at,
            server_types: serverData.server_types,
            server_data: serverData.server_data,
            vote_stats: serverData.vote_stats,
            votifier: serverData.votifier,
            creator: serverData.creator
        };
    }

    /**
     * Create admin vote DTO with sensitive data
     */
    static createVoteDTO(voteData) {
        return {
            id: voteData.id,
            server_id: voteData.server_id,
            username: voteData.username,
            ip_address: voteData.ip_address,
            user_agent: voteData.user_agent,
            headers: voteData.headers,
            recaptcha_token: voteData.recaptcha_token,
            recaptcha_score: voteData.recaptcha_score,
            referrer: voteData.referrer,
            verification_score: voteData.verification_score,
            ip_analysis: voteData.ip_analysis,
            votifier_sent: voteData.votifier_sent,
            votifier_response: voteData.votifier_response,
            created_at: voteData.created_at,
            updated_at: voteData.updated_at,
            server: voteData.server
        };
    }

    /**
     * Create admin user DTO with full details
     */
    static createUserDTO(userData) {
        return {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            last_login: userData.last_login,
            last_activity: userData.last_activity,
            server_count: userData.server_count,
            vote_count: userData.vote_count
        };
    }
}

module.exports = AdminDTO;