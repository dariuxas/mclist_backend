'use strict'

const BaseController = require('../../../controllers/BaseController');

/**
 * Configuration Controller
 * Handles HTTP requests for configuration management
 */
class ConfigController extends BaseController {
    constructor(configService, logger) {
        super(configService, logger);
        this.configService = configService;
        this.bindMethods();
    }

    /**
     * Get all configs (admin only)
     */
    async getAllConfigs(request, reply) {
        try {
            const { category } = request.query;
            
            const configs = await this.configService.getAll({ category });

            return this.sendSuccess(
                reply,
                { configs },
                'Konfigūracijos sėkmingai gautos',
                {},
                request,
                'get all configs'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get all configs');
        }
    }

    /**
     * Get public configs
     */
    async getPublicConfigs(request, reply) {
        try {
            const configs = await this.configService.getPublic();

            return this.sendSuccess(
                reply,
                { configs },
                'Viešos konfigūracijos sėkmingai gautos',
                {},
                request,
                'get public configs'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get public configs');
        }
    }

    /**
     * Get configs by category
     */
    async getConfigsByCategory(request, reply) {
        try {
            const { category } = request.params;
            
            const configs = await this.configService.getByCategory(category);

            return this.sendSuccess(
                reply,
                { configs },
                `Kategorijos '${category}' konfigūracijos sėkmingai gautos`,
                {},
                request,
                'get configs by category'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get configs by category');
        }
    }

    /**
     * Update config (admin only)
     */
    async updateConfig(request, reply) {
        try {
            const { key } = request.params;
            const updateData = request.body;

            const config = await this.configService.update(key, updateData);

            return this.sendSuccess(
                reply,
                { config: config.toJSON() },
                'Konfigūracija sėkmingai atnaujinta',
                {},
                request,
                'update config'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'update config');
        }
    }

    /**
     * Create new config (admin only)
     */
    async createConfig(request, reply) {
        try {
            const configData = request.body;

            const config = await this.configService.create(configData);

            return this.sendSuccess(
                reply,
                { config: config.toJSON() },
                'Konfigūracija sėkmingai sukurta',
                {},
                request,
                'create config',
                201
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'create config');
        }
    }

    /**
     * Delete config (admin only)
     */
    async deleteConfig(request, reply) {
        try {
            const { key } = request.params;

            const deleted = await this.configService.delete(key);

            if (!deleted) {
                return reply.apiError('Konfigūracija nerasta', [], 404, 'CONFIG_NOT_FOUND');
            }

            return this.sendSuccess(
                reply,
                { deleted: true },
                'Konfigūracija sėkmingai ištrinta',
                {},
                request,
                'delete config'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'delete config');
        }
    }

    /**
     * Bulk update configs (admin only)
     */
    async bulkUpdateConfigs(request, reply) {
        try {
            const { updates } = request.body;

            if (!Array.isArray(updates)) {
                return reply.apiError('Atnaujinimai turi būti masyvas', [], 400, 'INVALID_UPDATES');
            }

            const results = await this.configService.bulkUpdate(updates);

            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            return this.sendSuccess(
                reply,
                { 
                    results,
                    summary: {
                        total: results.length,
                        successful,
                        failed
                    }
                },
                `Masinis atnaujinimas baigtas: ${successful} sėkmingų, ${failed} nesėkmingų`,
                {},
                request,
                'bulk update configs'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'bulk update configs');
        }
    }

    /**
     * Get all categories
     */
    async getCategories(request, reply) {
        try {
            const categories = await this.configService.getCategories();

            return this.sendSuccess(
                reply,
                { categories },
                'Kategorijos sėkmingai gautos',
                {},
                request,
                'get categories'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'get categories');
        }
    }

    /**
     * Clear config cache (admin only)
     */
    async clearCache(request, reply) {
        try {
            this.configService.clearCache();

            return this.sendSuccess(
                reply,
                { cleared: true },
                'Konfigūracijų talpykla sėkmingai išvalyta',
                {},
                request,
                'clear cache'
            );
        } catch (error) {
            return this.handleError(error, request, reply, 'clear cache');
        }
    }
}

module.exports = ConfigController;