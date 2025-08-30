'use strict'

/**
 * User Profile Data Transfer Object
 * Standardizes user profile data structure across the application
 */
class UserProfileDTO {
    constructor(userData, options = {}) {
        this.id = userData.id;
        this.role = userData.role;
        this.created_at = userData.created_at;
        this.last_activity = userData.last_activity;

        // Include email only for own profile or admin
        if (options.includePrivateData) {
            this.email = userData.email;
            this.password_hash = userData.password_hash;
            this.updated_at = userData.updated_at;
            this.last_login = userData.last_login;
        }
    }

    /**
     * Create DTO from database row
     */
    static fromDatabase(row) {
        return new UserProfileDTO({
            id: row.id,
            email: row.email,
            password_hash: row.password_hash,
            role: row.role,
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_login: row.last_login,
            last_activity: row.last_activity
        }, { includePrivateData: true });
    }

    /**
     * Get public profile (limited data)
     */
    static forPublic(userData) {
        return new UserProfileDTO(userData, { includePrivateData: false });
    }

    /**
     * Get private profile (full data)
     */
    static forPrivate(userData) {
        return new UserProfileDTO(userData, { includePrivateData: true });
    }

    /**
     * Convert to database format
     */
    toDatabase() {
        return {
            email: this.email,
            password_hash: this.password_hash,
            role: this.role,
        };
    }

    /**
     * Convert to plain object
     */
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            role: this.role,
            created_at: this.created_at,
            updated_at: this.updated_at,
            last_login: this.last_login,
            last_activity: this.last_activity,
        };
    }
}

module.exports = UserProfileDTO;
