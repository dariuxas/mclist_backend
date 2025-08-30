'use strict'

/**
 * Reusable update schema components
 * These can be composed into larger schemas for different contexts
 */

const baseUpdateSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        title: { type: 'string' },
        content: { type: 'string' },
        category: {
            type: 'string',
            enum: ['update', 'event', 'announcement', 'maintenance', 'feature']
        },
        status: {
            type: 'string',
            enum: ['draft', 'published', 'archived']
        },
        published_at: { type: ['string', 'null'], format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
    }
};

const publicUpdateSchema = {
    type: 'object',
    properties: {
        id: { type: 'integer' },
        title: { type: 'string' },
        content: { type: 'string' },
        category: {
            type: 'string',
            enum: ['update', 'event', 'announcement', 'maintenance', 'feature']
        },
        published_at: { type: 'string', format: 'date-time' },
        created_at: { type: 'string', format: 'date-time' },
        author: {
            type: ['object', 'null'],
            properties: {
                id: { type: 'integer' },
                role: { type: 'string' }
            }
        }
    }
};

const fullUpdateSchema = {
    type: 'object',
    properties: {
        ...baseUpdateSchema.properties,
        author_id: { type: 'integer' },
        author: {
            type: ['object', 'null'],
            properties: {
                id: { type: 'integer' },
                role: { type: 'string' }
            }
        }
    }
};

const updateWithUserDataSchema = {
    type: 'object',
    properties: {
        ...publicUpdateSchema.properties,
        user_data: {
            type: ['object', 'null'],
            properties: {
                is_liked: { type: 'boolean' },
                is_bookmarked: { type: 'boolean' },
                is_read: { type: 'boolean' },
                like_count: { type: 'integer' },
                comment_count: { type: 'integer' }
            }
        }
    }
};

const paginatedUpdatesSchema = {
    type: 'object',
    properties: {
        updates: {
            type: 'array',
            items: publicUpdateSchema
        },
        pagination: {
            type: 'object',
            properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
                hasNext: { type: 'boolean' },
                hasPrev: { type: 'boolean' }
            }
        }
    }
};

module.exports = {
    baseUpdateSchema,
    publicUpdateSchema,
    fullUpdateSchema,
    updateWithUserDataSchema,
    paginatedUpdatesSchema
};
