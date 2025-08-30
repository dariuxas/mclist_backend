'use strict'

/**
 * Dependency Injection Container
 * Manages service dependencies and provides centralized instantiation
 */
class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    /**
     * Register a service factory
     * @param {string} name - Service name
     * @param {Function} factory - Factory function that creates the service
     * @param {boolean} singleton - Whether to create as singleton
     */
    register(name, factory, singleton = true) {
        this.services.set(name, { factory, singleton });
        return this;
    }

    /**
     * Get a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found in container`);
        }

        if (service.singleton) {
            if (!this.singletons.has(name)) {
                this.singletons.set(name, service.factory(this));
            }
            return this.singletons.get(name);
        }

        return service.factory(this);
    }

    /**
     * Check if service is registered
     * @param {string} name - Service name
     * @returns {boolean} True if registered
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Clear all services and singletons
     */
    clear() {
        this.services.clear();
        this.singletons.clear();
    }

    /**
     * Get all registered service names
     * @returns {Array<string>} Service names
     */
    getServiceNames() {
        return Array.from(this.services.keys());
    }
}

module.exports = Container;