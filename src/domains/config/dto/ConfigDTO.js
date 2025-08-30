'use strict'

/**
 * Configuration Data Transfer Object
 */
class ConfigDTO {
    constructor(configData) {
        this.id = configData.id;
        this.key = configData.key;
        this.value = configData.value;
        this.type = configData.type || 'string';
        this.description = configData.description;
        this.category = configData.category || 'general';
        this.is_public = configData.is_public || false;
        this.created_at = configData.created_at;
        this.updated_at = configData.updated_at;
    }

    /**
     * Create DTO from database row
     */
    static fromDatabase(row) {
        return new ConfigDTO({
            id: row.id,
            key: row.key,
            value: row.value,
            type: row.type,
            description: row.description,
            category: row.category,
            is_public: row.is_public,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    }

    /**
     * Convert to database format for insert/update
     */
    toDatabase() {
        return {
            key: this.key,
            value: this.value,
            type: this.type,
            description: this.description,
            category: this.category,
            is_public: this.is_public
        };
    }

    /**
     * Get typed value based on the type field
     */
    getTypedValue() {
        if (this.value === null || this.value === undefined) {
            return null;
        }

        switch (this.type) {
            case 'boolean':
                return this.value === 'true' || this.value === true;
            case 'integer':
                return parseInt(this.value, 10);
            case 'float':
                return parseFloat(this.value);
            case 'json':
                try {
                    return JSON.parse(this.value);
                } catch (error) {
                    return null;
                }
            case 'string':
            default:
                return String(this.value);
        }
    }

    /**
     * Set value with proper type conversion
     */
    setTypedValue(value) {
        if (value === null || value === undefined) {
            this.value = null;
            return;
        }

        switch (this.type) {
            case 'boolean':
                this.value = Boolean(value).toString();
                break;
            case 'integer':
                this.value = parseInt(value, 10).toString();
                break;
            case 'float':
                this.value = parseFloat(value).toString();
                break;
            case 'json':
                this.value = JSON.stringify(value);
                break;
            case 'string':
            default:
                this.value = String(value);
                break;
        }
    }

    /**
     * Convert to JSON for API responses
     */
    toJSON() {
        return {
            id: this.id,
            key: this.key,
            value: this.getTypedValue(),
            type: this.type,
            description: this.description,
            category: this.category,
            is_public: this.is_public,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }

    /**
     * Convert to public JSON (only public configs)
     */
    toPublicJSON() {
        if (!this.is_public) {
            return null;
        }

        return {
            key: this.key,
            value: this.getTypedValue(),
            type: this.type,
            description: this.description,
            category: this.category
        };
    }
}

module.exports = ConfigDTO;