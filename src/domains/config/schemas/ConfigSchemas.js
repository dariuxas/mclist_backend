'use strict'

// Config object schema
const configObject = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        key: { type: 'string' },
        value: { 
            oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
                { type: 'object' },
                { type: 'null' }
            ]
        },
        type: { 
            type: 'string',
            enum: ['string', 'integer', 'float', 'boolean', 'json']
        },
        description: { type: ['string', 'null'] },
        category: { type: 'string' },
        is_public: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
    }
};

// Public config object schema (limited fields)
const publicConfigObject = {
    type: 'object',
    properties: {
        key: { type: 'string' },
        value: { 
            oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' },
                { type: 'object' },
                { type: 'null' }
            ]
        },
        type: { 
            type: 'string',
            enum: ['string', 'integer', 'float', 'boolean', 'json']
        },
        description: { type: ['string', 'null'] },
        category: { type: 'string' }
    }
};

// Create config body schema
const createConfigBody = {
    type: 'object',
    required: ['key', 'value', 'type'],
    properties: {
        key: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            pattern: '^[a-zA-Z0-9._-]+$',
            description: 'Configuration key (alphanumeric, dots, underscores, hyphens only)'
        },
        value: {
            type: 'string',
            description: 'Configuration value (will be converted based on type)'
        },
        type: {
            type: 'string',
            enum: ['string', 'integer', 'float', 'boolean', 'json'],
            default: 'string',
            description: 'Value type for automatic conversion'
        },
        description: {
            type: 'string',
            maxLength: 500,
            description: 'Human-readable description of the configuration'
        },
        category: {
            type: 'string',
            maxLength: 50,
            default: 'general',
            description: 'Configuration category for organization'
        },
        is_public: {
            type: 'boolean',
            default: false,
            description: 'Whether this config is visible to non-admin users'
        }
    },
    additionalProperties: false
};

// Update config body schema
const updateConfigBody = {
    type: 'object',
    properties: {
        value: {
            type: 'string',
            description: 'New configuration value'
        },
        description: {
            type: 'string',
            maxLength: 500,
            description: 'Updated description'
        },
        is_public: {
            type: 'boolean',
            description: 'Updated public visibility'
        }
    },
    additionalProperties: false,
    minProperties: 1
};

// Bulk update body schema
const bulkUpdateBody = {
    type: 'object',
    required: ['updates'],
    properties: {
        updates: {
            type: 'array',
            minItems: 1,
            maxItems: 50,
            items: {
                type: 'object',
                required: ['key', 'value'],
                properties: {
                    key: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                    },
                    value: {
                        type: 'string'
                    }
                },
                additionalProperties: false
            }
        }
    },
    additionalProperties: false
};

// Query parameters
const configQuery = {
    type: 'object',
    properties: {
        category: {
            type: 'string',
            maxLength: 50,
            description: 'Filter by category'
        }
    },
    additionalProperties: false
};

// Path parameters
const configKeyParam = {
    type: 'object',
    required: ['key'],
    properties: {
        key: {
            type: 'string',
            minLength: 1,
            maxLength: 100,
            description: 'Configuration key'
        }
    }
};

const categoryParam = {
    type: 'object',
    required: ['category'],
    properties: {
        category: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            description: 'Configuration category'
        }
    }
};

// Response schemas
const getAllConfigsResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                configs: {
                    type: 'array',
                    items: configObject
                }
            }
        }
    }
};

const getPublicConfigsResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                configs: {
                    type: 'array',
                    items: publicConfigObject
                }
            }
        }
    }
};

const configResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                config: configObject
            }
        }
    }
};

const bulkUpdateResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                results: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            key: { type: 'string' },
                            success: { type: 'boolean' },
                            config: configObject,
                            error: { type: 'string' }
                        }
                    }
                },
                summary: {
                    type: 'object',
                    properties: {
                        total: { type: 'integer' },
                        successful: { type: 'integer' },
                        failed: { type: 'integer' }
                    }
                }
            }
        }
    }
};

const categoriesResponse = {
    type: 'object',
    properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
            type: 'object',
            properties: {
                categories: {
                    type: 'array',
                    items: { type: 'string' }
                }
            }
        }
    }
};

module.exports = {
    configObject,
    publicConfigObject,
    createConfigBody,
    updateConfigBody,
    bulkUpdateBody,
    configQuery,
    configKeyParam,
    categoryParam,
    getAllConfigsResponse,
    getPublicConfigsResponse,
    configResponse,
    bulkUpdateResponse,
    categoriesResponse
};