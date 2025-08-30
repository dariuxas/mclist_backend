'use strict'

/**
 * Auth User Data Transfer Object
 * Standardizes user data for authentication operations
 */
class AuthUserDTO {
    constructor(userData, options = {}) {
        this.id = userData.id;
        this.email = userData.email;
        this.role = userData.role;
        this.created_at = userData.created_at;
        this.updated_at = userData.updated_at;
        this.last_login = userData.last_login;

        // Include tokens if provided (for login/register responses)
        if (options.includeTokens && options.tokens) {
            this.tokens = options.tokens;
        }
    }

    /**
     * Create DTO for login/register response
     */
    static forAuthResponse(userData, tokens) {
        return new AuthUserDTO(userData, { includeTokens: true, tokens });
    }

    /**
     * Create DTO for profile response
     */
    static forProfile(userData) {
        return new AuthUserDTO(userData, { includeTokens: false });
    }

    /**
     * Convert to plain object
     */
    toJSON() {
        const result = {
            id: this.id,
            email: this.email,
            role: this.role,
            created_at: this.created_at,
            updated_at: this.updated_at,
            last_login: this.last_login,
        };

        // Add tokens if they exist
        if (this.tokens) {
            result.tokens = this.tokens;
        }

        return result;
    }
}

module.exports = AuthUserDTO;