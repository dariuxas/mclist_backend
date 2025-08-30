'use strict'

const BaseService = require('../../../services/BaseService');

/**
 * Configuration Service
 * Handles configuration management with caching
 */
class ConfigService extends BaseService {
    constructor(configRepository, logger) {
        super(configRepository, logger);
        this.configRepository = configRepository;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.lastCacheUpdate = null;
    }

    /**
     * Get config value with caching
     */
    async get(key, defaultValue = null) {
        try {
            await this.refreshCacheIfNeeded();
            
            const cached = this.cache.get(key);
            if (cached !== undefined) {
                return cached;
            }

            // If not in cache, fetch from database
            const value = await this.configRepository.getValue(key, defaultValue);
            this.cache.set(key, value);
            return value;
        } catch (error) {
            this.log('error', { key, error: error.message }, 'Failed to get config value');
            return defaultValue;
        }
    }

    /**
     * Set config value and update cache
     */
    async set(key, value) {
        try {
            const config = await this.configRepository.setValue(key, value);
            this.cache.set(key, config.getTypedValue());
            
            this.log('info', { key, value }, 'Config value updated');
            return config;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'set config value');
        }
    }

    /**
     * Get all configs (admin only)
     */
    async getAll(options = {}) {
        try {
            return await this.configRepository.findAll(options);
        } catch (error) {
            this.handleRepositoryError(error, 'get all configs');
        }
    }

    /**
     * Get configs by category
     */
    async getByCategory(category) {
        try {
            return await this.configRepository.findByCategory(category);
        } catch (error) {
            this.handleRepositoryError(error, 'get configs by category');
        }
    }

    /**
     * Get public configs only
     */
    async getPublic() {
        try {
            const configs = await this.configRepository.findPublic();
            return configs.map(config => config.toPublicJSON()).filter(Boolean);
        } catch (error) {
            this.handleRepositoryError(error, 'get public configs');
        }
    }

    /**
     * Update config
     */
    async update(key, updateData) {
        try {
            const config = await this.configRepository.updateByKey(key, updateData);
            
            // Update cache
            this.cache.set(key, config.getTypedValue());
            
            this.log('info', { key, updateData }, 'Config updated');
            return config;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'update config');
        }
    }

    /**
     * Create new config
     */
    async create(configData) {
        try {
            const config = await this.configRepository.create(configData);
            
            // Update cache
            this.cache.set(config.key, config.getTypedValue());
            
            this.log('info', { key: config.key }, 'Config created');
            return config;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'create config');
        }
    }

    /**
     * Delete config
     */
    async delete(key) {
        try {
            const deleted = await this.configRepository.deleteByKey(key);
            
            if (deleted) {
                this.cache.delete(key);
                this.log('info', { key }, 'Config deleted');
            }
            
            return deleted;
        } catch (error) {
            this.handleRepositoryError(error, 'delete config');
        }
    }

    /**
     * Bulk update configs
     */
    async bulkUpdate(updates) {
        try {
            const results = await this.configRepository.bulkUpdate(updates);
            
            // Update cache for successful updates
            results.forEach(result => {
                if (result.success && result.config) {
                    this.cache.set(result.key, result.config.getTypedValue());
                }
            });
            
            this.log('info', { count: updates.length }, 'Bulk config update completed');
            return results;
        } catch (error) {
            this.handleRepositoryError(error, 'bulk update configs');
        }
    }

    /**
     * Get all categories
     */
    async getCategories() {
        try {
            return await this.configRepository.getCategories();
        } catch (error) {
            this.handleRepositoryError(error, 'get categories');
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.lastCacheUpdate = null;
        this.log('info', {}, 'Config cache cleared');
    }

    /**
     * Refresh cache if needed
     */
    async refreshCacheIfNeeded() {
        const now = Date.now();
        
        if (!this.lastCacheUpdate || (now - this.lastCacheUpdate) > this.cacheTimeout) {
            await this.refreshCache();
        }
    }

    /**
     * Refresh entire cache
     */
    async refreshCache() {
        try {
            const configs = await this.configRepository.findAll();
            
            this.cache.clear();
            configs.forEach(config => {
                this.cache.set(config.key, config.getTypedValue());
            });
            
            this.lastCacheUpdate = Date.now();
            this.log('debug', { count: configs.length }, 'Config cache refreshed');
        } catch (error) {
            this.log('error', { error: error.message }, 'Failed to refresh config cache');
        }
    }

    /**
     * Helper methods for common configs
     */
    
    // reCAPTCHA settings
    async isRecaptchaEnabled() {
        return await this.get('recaptcha.enabled', true);
    }

    async getRecaptchaSiteKey() {
        return await this.get('recaptcha.site_key', '');
    }

    async getRecaptchaSecretKey() {
        return await this.get('recaptcha.secret_key', '');
    }

    async getRecaptchaMinScore() {
        return await this.get('recaptcha.min_score', 0.5);
    }

    // Vote settings
    async getVoteDailyLimit() {
        return await this.get('vote.daily_limit', 1);
    }

    // Server settings
    async getMaxServersPerUser() {
        return await this.get('server.max_per_user', 1);
    }

    // Authentication security settings
    async getMaxLoginAttempts() {
        return await this.get('auth.max_login_attempts', 5);
    }

    async getLockoutDuration() {
        return await this.get('auth.lockout_duration', 3600); // 1 hour in seconds
    }

    async getAttemptWindow() {
        return await this.get('auth.attempt_window', 600); // 10 minutes in seconds
    }

    // Site settings
    async getSiteName() {
        return await this.get('site.name', 'MCList');
    }

    async isMaintenanceMode() {
        return await this.get('site.maintenance_mode', false);
    }
}

module.exports = ConfigService;