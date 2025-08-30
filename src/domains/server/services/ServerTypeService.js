'use strict'

const BaseService = require('../../../services/BaseService');

/**
 * Server Type Service
 * Handles server type management operations
 */
class ServerTypeService extends BaseService {
    constructor(serverTypeRepository, logger) {
        super(serverTypeRepository, logger);
        this.serverTypeRepository = serverTypeRepository;
    }

    /**
     * Get all server types
     */
    async getServerTypes(options = {}) {
        try {
            return await this.serverTypeRepository.findAll(options);
        } catch (error) {
            this.handleRepositoryError(error, 'get server types');
        }
    }

    /**
     * Get server type by ID
     */
    async getServerTypeById(id) {
        try {
            const serverType = await this.serverTypeRepository.findById(id);
            if (!serverType) {
                throw this.createError('Server type not found', 404, 'SERVER_TYPE_NOT_FOUND');
            }
            return serverType;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'get server type by id');
        }
    }

    /**
     * Create new server type (admin only)
     */
    async createServerType(serverTypeData, userId) {
        try {
            // Check if name already exists
            const existingType = await this.serverTypeRepository.findByName(serverTypeData.name);
            if (existingType) {
                throw this.createError('Server type with this name already exists', 409, 'SERVER_TYPE_EXISTS');
            }

            // Set defaults
            const typeToCreate = {
                ...serverTypeData,
                color: serverTypeData.color || '#3498db',
                icon: serverTypeData.icon || 'server',
                is_active: serverTypeData.is_active !== undefined ? serverTypeData.is_active : true
            };

            const serverType = await this.serverTypeRepository.create(typeToCreate);

            this.log('info', { serverTypeId: serverType.id, userId }, 'Server type created successfully');
            return serverType;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'create server type');
        }
    }

    /**
     * Update server type (admin only)
     */
    async updateServerType(id, serverTypeData, userId) {
        try {
            const existingType = await this.serverTypeRepository.findById(id);
            if (!existingType) {
                throw this.createError('Server type not found', 404, 'SERVER_TYPE_NOT_FOUND');
            }

            // Check for duplicate name if being updated
            if (serverTypeData.name) {
                const nameExists = await this.serverTypeRepository.nameExists(serverTypeData.name, id);
                if (nameExists) {
                    throw this.createError('Server type with this name already exists', 409, 'SERVER_TYPE_EXISTS');
                }
            }

            const updatedType = await this.serverTypeRepository.update(id, serverTypeData);

            this.log('info', { 
                serverTypeId: id, 
                userId, 
                updatedFields: Object.keys(serverTypeData) 
            }, 'Server type updated successfully');

            return updatedType;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'update server type');
        }
    }

    /**
     * Delete server type (admin only)
     */
    async deleteServerType(id, userId) {
        try {
            const serverType = await this.serverTypeRepository.findById(id);
            if (!serverType) {
                throw this.createError('Server type not found', 404, 'SERVER_TYPE_NOT_FOUND');
            }

            const deleted = await this.serverTypeRepository.delete(id);
            if (!deleted) {
                throw this.createError('Failed to delete server type', 500, 'DELETE_FAILED');
            }

            this.log('info', { serverTypeId: id, userId }, 'Server type deleted successfully (including server relationships)');
            return true;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'delete server type');
        }
    }

    /**
     * Toggle server type active status (admin only)
     */
    async toggleActive(id, userId) {
        try {
            const serverType = await this.serverTypeRepository.findById(id);
            if (!serverType) {
                throw this.createError('Server type not found', 404, 'SERVER_TYPE_NOT_FOUND');
            }

            const updatedType = await this.serverTypeRepository.update(id, {
                is_active: !serverType.is_active
            });

            this.log('info', { 
                serverTypeId: id, 
                userId, 
                active: updatedType.is_active 
            }, 'Server type active status toggled');

            return updatedType;
        } catch (error) {
            if (error.statusCode) throw error;
            this.handleRepositoryError(error, 'toggle server type active');
        }
    }
}

module.exports = ServerTypeService;