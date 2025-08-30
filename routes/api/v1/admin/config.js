'use strict'

const { authenticate, requireRole } = require('../../../../src/middleware/auth');
const { 
    createApiResponse,
    errorResponse 
} = require('../../../../src/shared/schemas/components/BaseSchemaComponents');

const {
    getAllConfigsResponse,
    configResponse,
    bulkUpdateResponse,
    categoriesResponse,
    createConfigBody,
    updateConfigBody,
    bulkUpdateBody,
    configQuery,
    configKeyParam,
    categoryParam
} = require('../../../../src/domains/config/schemas/ConfigSchemas');

module.exports = async function (fastify) {
    const configService = fastify.getService('configService');

    // Get all configs (admin only)
    fastify.get('/', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Get all configurations',
            description: 'Get all system configurations (admin only)',
            
            response: {
                200: getAllConfigsResponse,
                401: errorResponse,
                403: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const configs = await configService.getAll(request.query);
            
            return reply.success({
                configs: configs.map(config => config.toJSON())
            }, 'Configurations retrieved successfully');
        }
    });

    // Get configs by category (admin only)
    fastify.get('/category/:category', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Get configurations by category',
            description: 'Get all configurations in a specific category',
            
            response: {
                200: getAllConfigsResponse,
                401: errorResponse,
                403: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const { category } = request.params;
            const configs = await configService.getByCategory(category);
            
            return reply.success({
                configs: configs.map(config => config.toJSON())
            }, `Configurations for category '${category}' retrieved successfully`);
        }
    });

    // Get all categories (admin only)
    fastify.get('/categories', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Get all configuration categories',
            description: 'Get list of all configuration categories',
            response: {
                200: categoriesResponse,
                401: errorResponse,
                403: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const categories = await configService.getCategories();
            
            return reply.success({
                categories
            }, 'Categories retrieved successfully');
        }
    });

    // Create new config (admin only)
    fastify.post('/', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Create new configuration',
            description: 'Create a new system configuration',
            // Validation handled by service layer
            response: {
                201: configResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                409: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const config = await configService.create(request.body);
            
            return reply.code(201).send({
                success: true,
                message: 'Configuration created successfully',
                data: { config: config.toJSON() }
            });
        }
    });

    // Update config (admin only)
    fastify.put('/:key', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Update configuration',
            description: 'Update an existing configuration',
            
            // Validation handled by service layer
            response: {
                200: configResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const { key } = request.params;
            const config = await configService.update(key, request.body);
            
            return reply.success({
                config: config.toJSON()
            }, 'Configuration updated successfully');
        }
    });

    // Bulk update configs (admin only)
    fastify.put('/bulk', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Bulk update configurations',
            description: 'Update multiple configurations at once',
            // Validation handled by service layer
            response: {
                200: bulkUpdateResponse,
                400: errorResponse,
                401: errorResponse,
                403: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const { updates } = request.body;
            const results = await configService.bulkUpdate(updates);
            
            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;
            
            return reply.success({
                results: results.map(result => ({
                    key: result.key,
                    success: result.success,
                    config: result.config ? result.config.toJSON() : undefined,
                    error: result.error
                })),
                summary: {
                    total: results.length,
                    successful,
                    failed
                }
            }, `Bulk update completed: ${successful} successful, ${failed} failed`);
        }
    });

    // Delete config (admin only)
    fastify.delete('/:key', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Delete configuration',
            description: 'Delete a configuration',
            
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        deleted: { type: 'boolean' }
                    }
                }),
                401: errorResponse,
                403: errorResponse,
                404: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            const { key } = request.params;
            const deleted = await configService.delete(key);
            
            if (!deleted) {
                return reply.code(404).send({
                    success: false,
                    message: 'Configuration not found',
                    errorCode: 'CONFIG_NOT_FOUND'
                });
            }
            
            return reply.success({
                deleted: true
            }, 'Configuration deleted successfully');
        }
    });

    // Clear cache (admin only)
    fastify.post('/cache/clear', {
        schema: {
      tags: ['Admin - Configuration'],
            security: [{ bearerAuth: [] }],
            summary: 'Clear configuration cache',
            description: 'Clear the configuration cache to force reload from database',
            response: {
                200: createApiResponse({
                    type: 'object',
                    properties: {
                        cleared: { type: 'boolean' }
                    }
                }),
                401: errorResponse,
                403: errorResponse,
                500: errorResponse
            }
        },
        preHandler: [authenticate, requireRole('admin')],
        handler: async (request, reply) => {
            configService.clearCache();
            
            return reply.success({
                cleared: true
            }, 'Configuration cache cleared successfully');
        }
    });

    fastify.log.info('⚙️  Admin config routes registered');
};