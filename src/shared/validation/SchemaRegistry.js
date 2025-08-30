'use strict';

/**
 * Schema Registry for validation middleware
 * Automatically registers all schemas for real-time validation
 */
class SchemaRegistry {
    constructor() {
        this.schemas = new Map();
    }

    /**
     * Register a schema with a name
     */
    register(name, schema) {
        // Extract body schema if it's a full route schema
        const bodySchema = schema.body || schema;
        this.schemas.set(name, bodySchema);
    }

    /**
     * Register multiple schemas at once
     */
    registerBatch(schemas) {
        Object.entries(schemas).forEach(([name, schema]) => {
            this.register(name, schema);
        });
    }

    /**
     * Get a registered schema
     */
    get(name) {
        return this.schemas.get(name);
    }

    /**
     * Check if schema exists
     */
    has(name) {
        return this.schemas.has(name);
    }

    /**
     * Get all registered schema names
     */
    getNames() {
        return Array.from(this.schemas.keys());
    }

    /**
     * Auto-register schemas from domain modules
     */
    autoRegisterDomainSchemas() {
        const registrations = [
            {
                name: 'auth',
                path: '../../domains/auth/schemas/AuthSchemas',
                schemas: ['registerSchema', 'loginSchema', 'refreshTokenSchema'],
                mappings: { registerSchema: 'register', loginSchema: 'login', refreshTokenSchema: 'refreshToken' }
            },
            {
                name: 'user',
                path: '../../domains/user/schemas/UserProfileSchemas',
                schemas: ['updateUserProfileBody'],
                mappings: { updateUserProfileBody: 'updateUserProfile' }
            },
            {
                name: 'vote',
                path: '../../domains/vote/schemas/VoteSchemas',
                schemas: ['createVoteBody'],
                mappings: { createVoteBody: 'createVote' }
            },
            {
                name: 'server',
                path: '../../domains/server/schemas/ServerSchemas',
                schemas: ['createServerBody', 'updateServerBody'],
                mappings: { createServerBody: 'createServer', updateServerBody: 'updateServer' }
            }
        ];

        for (const registration of registrations) {
            try {
                const schemaModule = require(registration.path);
                
                for (const schemaName of registration.schemas) {
                    if (schemaModule[schemaName]) {
                        const mappedName = registration.mappings[schemaName] || schemaName;
                        this.register(mappedName, schemaModule[schemaName]);
                    }
                }
                
                console.log(`✅ Registered ${registration.name} schemas`);
            } catch (error) {
                console.warn(`⚠️ Failed to register ${registration.name} schemas:`, error.message);
            }
        }
    }

    /**
     * Initialize the registry with all available schemas
     */
    initialize() {
        this.autoRegisterDomainSchemas();
        console.log(`Schema registry initialized with ${this.schemas.size} schemas:`, this.getNames());
    }
}

// Create singleton instance
const schemaRegistry = new SchemaRegistry();

module.exports = schemaRegistry;
