'use strict'

/**
 * Server Type Data Transfer Object
 * Standardizes server type data structure across the application
 */
class ServerTypeDTO {
    constructor(serverTypeData) {
        this.id = serverTypeData.id;
        this.name = serverTypeData.name;
        this.description = serverTypeData.description;
        this.color = serverTypeData.color;
        this.icon = serverTypeData.icon;
        this.is_active = serverTypeData.is_active;
        this.created_at = serverTypeData.created_at;
        this.updated_at = serverTypeData.updated_at;

        // Include server count if available
        if (serverTypeData.server_count !== undefined) {
            this.server_count = serverTypeData.server_count;
        }
    }

    /**
     * Create DTO from database row
     */
    static fromDatabase(row) {
        return new ServerTypeDTO({
            id: row.id,
            name: row.name,
            description: row.description,
            color: row.color,
            icon: row.icon,
            is_active: row.is_active,
            created_at: row.created_at,
            updated_at: row.updated_at,
            server_count: row.server_count
        });
    }

    /**
     * Convert to database format for insert/update
     */
    toDatabase() {
        return {
            name: this.name,
            description: this.description,
            color: this.color,
            icon: this.icon,
            is_active: this.is_active
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
            color: this.color,
            icon: this.icon,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };

        if (this.server_count !== undefined) {
            json.server_count = this.server_count;
        }

        return json;
    }
}

module.exports = ServerTypeDTO;