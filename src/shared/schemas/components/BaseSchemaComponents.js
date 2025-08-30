'use strict'

/**
 * Base Schema Components
 * Reusable schema components for consistent API structure
 */

// Standard pagination schema
const paginationSchema = {
    type: 'object',
    properties: {
        page: { 
            type: 'integer',
            minimum: 1,
            description: 'Current page number'
        },
        limit: { 
            type: 'integer',
            minimum: 1,
            description: 'Items per page'
        },
        total: { 
            type: 'integer',
            minimum: 0,
            description: 'Total number of items'
        },
        totalPages: { 
            type: 'integer',
            minimum: 0,
            description: 'Total number of pages'
        },
        hasNext: { 
            type: 'boolean',
            description: 'Whether there are more pages'
        },
        hasPrev: { 
            type: 'boolean',
            description: 'Whether there are previous pages'
        }
    },
    required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
};

// Standard pagination query parameters
const paginationQuery = {
    type: 'object',
    properties: {
        page: {
            type: 'integer',
            minimum: 1,
            default: 1,
            description: 'Page number'
        },
        limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
            description: 'Items per page'
        }
    }
};

// Standard API response wrapper using shared $ref envelope
// Requires Response.Success schema to be registered via fastify.addSchema
const createApiResponse = (dataSchema, message = 'Operation completed successfully') => ({
    allOf: [
        { $ref: 'Response.Success#' },
        {
            properties: {
                message: { type: 'string', default: message },
                data: dataSchema
            },
            required: ['success', 'message', 'data']
        }
    ]
});

// Standard paginated response
const createPaginatedResponse = (itemsSchema, itemsName = 'items') => 
    createApiResponse({
        type: 'object',
        properties: {
            [itemsName]: {
                type: 'array',
                items: itemsSchema
            },
            pagination: paginationSchema
        },
        required: [itemsName, 'pagination']
    });

// Standard error response composed from shared $ref and aligned with middleware formatting
const errorResponse = {
    allOf: [
        { $ref: 'Response.Error#' }
    ]
};

// Common query filters
const searchQuery = {
    type: 'object',
    properties: {
        search: {
            type: 'string',
            maxLength: 100,
            description: 'Search term'
        }
    }
};

const dateRangeQuery = {
    type: 'object',
    properties: {
        start_date: {
            type: 'string',
            format: 'date',
            description: 'Start date (YYYY-MM-DD)'
        },
        end_date: {
            type: 'string',
            format: 'date',
            description: 'End date (YYYY-MM-DD)'
        }
    }
};

const sortQuery = {
    type: 'object',
    properties: {
        sort_by: {
            type: 'string',
            description: 'Field to sort by'
        },
        sort_order: {
            type: 'string',
            enum: ['asc', 'desc'],
            default: 'desc',
            description: 'Sort order'
        }
    }
};

// ID parameter schema
const idParam = {
    type: 'object',
    properties: {
        id: { 
            type: 'integer', 
            minimum: 1,
            description: 'Resource ID'
        }
    },
    required: ['id']
};

// Combine query schemas
const combineQueries = (...queries) => {
    const combined = {
        type: 'object',
        properties: {},
        additionalProperties: false
    };

    queries.forEach(query => {
        if (query.properties) {
            Object.assign(combined.properties, query.properties);
        }
    });

    return combined;
};

module.exports = {
    paginationSchema,
    paginationQuery,
    createApiResponse,
    createPaginatedResponse,
    errorResponse,
    searchQuery,
    dateRangeQuery,
    sortQuery,
    idParam,
    combineQueries
};